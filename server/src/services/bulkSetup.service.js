const Semester = require('../models/Semester');
const Batch = require('../models/Batch');
const ClearanceItem = require('../models/ClearanceItem');
const User = require('../models/User');
const Program = require('../models/Program');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');

const bulkSetupService = {
  /**
   * Orchestrates the full bulk semester setup from parsed data.
   * Creates: Semester → Batches → Clearance Items → Students (with batch assignment).
   *
   * @param {Object} params
   * @param {Object} params.semesterConfig  - Semester row from sheet 1
   * @param {Array}  params.clearanceItems  - Clearance items array from sheet 2
   * @param {Array}  params.students        - Student roster array from sheet 3
   * @param {Object} params.adminUser       - The logged-in admin (for audit context)
   * @returns {Object} Detailed result summary
   */
  async bulkSetupSemester({ semesterConfig, clearanceItems, students, adminUser }) {
    const result = {
      semester: null,
      batchesCreated: [],
      clearanceItemsCreated: [],
      studentsCreated: [],
      studentsFailed: [],
      warnings: [],
    };

    // ─── Step 1: Resolve Program ───
    const program = await Program.findOne({ code: semesterConfig.programCode.toUpperCase() });
    if (!program) {
      throw AppError.badRequest(
        `Program with code "${semesterConfig.programCode}" not found. Please create the program first.`
      );
    }

    // ─── Step 2: Resolve or Create Semester ───
    const existingSemester = await Semester.findOne({
      programId: program._id,
      semNumber: semesterConfig.semNumber,
      academicYear: semesterConfig.academicYear,
    });

    let semester;
    if (existingSemester) {
      // Reuse existing semester — clear its old clearance items so we can reprovision cleanly
      semester = existingSemester;
      const ClearanceItem = require('../models/ClearanceItem');
      const deletedItems = await ClearanceItem.deleteMany({ semesterId: semester._id });
      logger.info('Bulk setup: Reusing existing semester, removed old clearance items', {
        semesterId: semester._id,
        deletedCount: deletedItems.deletedCount,
      });
      result.reusingExistingSemester = true;
    } else {
      const semType = semesterConfig.semNumber % 2 === 1 ? 'ODD' : 'EVEN';
      semester = await Semester.create({
        programId: program._id,
        name: `Semester ${semesterConfig.semNumber}`,
        semNumber: semesterConfig.semNumber,
        academicYear: semesterConfig.academicYear,
        type: semesterConfig.type || semType,
        startDate: semesterConfig.startDate || new Date(),
        endDate: semesterConfig.endDate || new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
        clearanceDeadline:
          semesterConfig.clearanceDeadline ||
          new Date(Date.now() + 140 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
    }

    result.semester = {
      _id: semester._id,
      name: semester.name,
      semNumber: semester.semNumber,
      academicYear: semester.academicYear,
    };

    logger.info('Bulk setup: Semester resolved', {
      semesterId: semester._id,
      program: program.code,
      reused: !!existingSemester,
    });

    // ─── Step 3: Extract unique batch names and find or create Batches ───
    const batchNames = [...new Set(students.map((s) => s.batch?.trim()).filter(Boolean))];

    const batchMap = {}; // name → Batch doc
    for (const batchName of batchNames) {
      try {
        let batch = await Batch.findOne({
          semesterId: semester._id,
          name: batchName,
        });
        if (!batch) {
          batch = await Batch.create({
            semesterId: semester._id,
            name: batchName,
          });
          result.batchesCreated.push({ _id: batch._id, name: batchName });
        }
        batchMap[batchName] = batch;
      } catch (err) {
        result.warnings.push(`Batch "${batchName}": ${err.message}`);
      }
    }

    logger.info('Bulk setup: Batches created', {
      count: Object.keys(batchMap).length,
      names: batchNames,
    });

    // Helper to safely extract teacher emails from various formats
    const extractEmailFromPair = (str) => {
      const match = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      return match ? match[1].toLowerCase().trim() : '';
    };

    // ─── Step 4: Resolve teacher emails → User IDs (Auto-provision missing teachers) ───
    const allTeacherEmails = new Set();
    for (const item of clearanceItems) {
      if (item.teacherEmail) allTeacherEmails.add(item.teacherEmail.toLowerCase().trim());
      if (Array.isArray(item.labBatches)) {
        for (const lb of item.labBatches) {
          if (lb.teacherEmail) allTeacherEmails.add(lb.teacherEmail.toLowerCase().trim());
        }
      } else if (typeof item.labBatches === 'string') {
        const pairs = item.labBatches.split(/[,;\n]/);
        for (const pair of pairs) {
          const email = extractEmailFromPair(pair);
          if (email) allTeacherEmails.add(email);
        }
      }
      if (Array.isArray(item.electiveOptions)) {
        for (const opt of item.electiveOptions) {
          if (opt.teacherEmail) allTeacherEmails.add(opt.teacherEmail.toLowerCase().trim());
        }
      } else if (typeof item.electiveOptions === 'string') {
        const pairs = item.electiveOptions.split(/[,;\n]/);
        for (const pair of pairs) {
          const email = extractEmailFromPair(pair);
          if (email) allTeacherEmails.add(email);
        }
      }
    }

    const teacherEmailMap = {};
    for (const email of allTeacherEmails) {
      if (!email) continue;
      let teacher = await User.findOne({ email: email.toLowerCase() });
      if (!teacher) {
        // Auto-provision teacher with standard credentials so setup never fails
        const cleanName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        teacher = await User.create({
          name: cleanName.startsWith('Prof') ? cleanName : `Prof. ${cleanName}`,
          email: email.toLowerCase(),
          password: 'Pass@Teacher123!',
          role: 'teacher',
          department: program.department || 'Emerging Technologies',
          isActive: true,
        });
        logger.info('Bulk setup: Auto-provisioned teacher', { email: teacher.email, name: teacher.name });
      }
      teacherEmailMap[email.toLowerCase()] = teacher._id;
    }

    // Helper to find a Batch document by flexible name matching
    const findBatchDoc = (name) => {
      if (!name) return null;
      if (batchMap[name]) return batchMap[name];
      const clean = name.toLowerCase().replace(/[\s_-]/g, '');
      for (const [k, doc] of Object.entries(batchMap)) {
        const kClean = k.toLowerCase().replace(/[\s_-]/g, '');
        if (kClean === clean || kClean.includes(clean) || clean.includes(kClean)) {
          return doc;
        }
      }
      return Object.values(batchMap)[0] || null;
    };

    // ─── Step 5: Create Clearance Items ───
    for (const item of clearanceItems) {
      try {
        const clearanceData = {
          semesterId: semester._id,
          srNo: item.srNo,
          title: item.title,
          type: item.type,
          subjectCode: item.subjectCode || '',
          isRequired: item.isRequired !== false,
        };

        if (item.type === 'theory' || item.type === 'special') {
          const teacherId = teacherEmailMap[item.teacherEmail?.toLowerCase()?.trim()] || Object.values(teacherEmailMap)[0];
          clearanceData.theoryTeacherId = teacherId;
        }

        if (item.type === 'lab') {
          const labBatchTeachers = [];
          const rawBatches = Array.isArray(item.labBatches) ? item.labBatches : [];
          
          for (const lb of rawBatches) {
            const teacherId = teacherEmailMap[lb.teacherEmail?.toLowerCase()?.trim()];
            const batch = findBatchDoc(lb.batchName);
            if (batch && teacherId) {
              labBatchTeachers.push({ batchId: batch._id, teacherId });
            }
          }

          // If no specific labBatchTeachers parsed, map every batch in the semester
          if (labBatchTeachers.length === 0 && Object.keys(batchMap).length > 0) {
            const teacherIds = Object.values(teacherEmailMap);
            let tIdx = 0;
            for (const b of Object.values(batchMap)) {
              labBatchTeachers.push({
                batchId: b._id,
                teacherId: teacherIds[tIdx % teacherIds.length],
              });
              tIdx++;
            }
          }
          clearanceData.labBatchTeachers = labBatchTeachers;
        }

        if (item.type === 'elective') {
          clearanceData.electiveGroup = item.electiveGroup || 'Elective';
          clearanceData.isElective = true;
          const electiveOptions = [];
          const rawOptions = Array.isArray(item.electiveOptions) ? item.electiveOptions : [];
          for (const opt of rawOptions) {
            const teacherId = teacherEmailMap[opt.teacherEmail?.toLowerCase()?.trim()] || Object.values(teacherEmailMap)[0];
            if (opt.name) {
              electiveOptions.push({ name: opt.name, teacherId });
            }
          }
          clearanceData.electiveOptions = electiveOptions;
        }

        const created = await ClearanceItem.create(clearanceData);
        result.clearanceItemsCreated.push({
          _id: created._id,
          title: created.title,
          type: created.type,
          subjectCode: created.subjectCode,
        });
      } catch (err) {
        result.warnings.push(`Item "${item.title}": ${err.message}`);
      }
    }

    logger.info('Bulk setup: Clearance items created', {
      count: result.clearanceItemsCreated.length,
    });

    // ─── Step 6: Create Students + Assign to Batches ───
    // Resolve elective choices: find the created ClearanceItem elective option IDs
    const electiveClearanceItems = await ClearanceItem.find({
      semesterId: semester._id,
      type: 'elective',
    });

    const electiveOptionMap = {}; // optionName (lowercase) → option._id
    for (const ci of electiveClearanceItems) {
      for (const opt of ci.electiveOptions || []) {
        electiveOptionMap[opt.name.toLowerCase().trim()] = opt._id;
      }
    }

    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      const rowIndex = i + 2; // Excel is 1-indexed + header row

      try {
        if (!row.email || !row.name || !row.enrollmentNo) {
          result.studentsFailed.push({
            row: rowIndex,
            name: row.name || 'MISSING',
            reason: 'Missing required field (name, email, or enrollmentNo)',
          });
          continue;
        }

        // Check for existing user
        const existingUser = await User.findOne({
          $or: [
            { email: row.email.toLowerCase().trim() },
            { enrollmentNo: row.enrollmentNo.trim() },
          ],
        });

        let student;
        if (existingUser) {
          // Student already exists in the system — update their semester, batch, section, and elective
          const updateFields = {
            name: row.name?.trim() || existingUser.name,
            currentSemester: semesterConfig.semNumber,
            section: row.section || existingUser.section || 'A',
            programId: program._id,
            isActive: true,
          };

          if (row.batch && batchMap[row.batch.trim()]) {
            updateFields.batchId = batchMap[row.batch.trim()]._id;
          }

          if (row.electiveChoice) {
            const electiveId = electiveOptionMap[row.electiveChoice.toLowerCase().trim()];
            if (electiveId) {
              updateFields.selectedElective = electiveId;
            }
          }

          student = await User.findByIdAndUpdate(existingUser._id, updateFields, { new: true });

          // Add student to the batch's studentIds array
          if (updateFields.batchId) {
            await Batch.findByIdAndUpdate(updateFields.batchId, {
              $addToSet: { studentIds: student._id },
            });
          }

          result.studentsCreated.push({
            _id: student._id,
            name: student.name,
            enrollmentNo: student.enrollmentNo,
            batch: row.batch || 'None',
            updated: true,
          });
        } else {
          // Generate default password satisfying strength requirements (min 8 chars, upper, lower, number, special)
          const defaultPassword = 'Pass@' + row.enrollmentNo.trim() + '1';

          const studentData = {
            name: row.name.trim(),
            email: row.email.toLowerCase().trim(),
            password: defaultPassword,
            role: 'student',
            programId: program._id,
            enrollmentNo: row.enrollmentNo.trim(),
            currentSemester: semesterConfig.semNumber,
            section: row.section || 'A',
            isActive: true,
          };

          // Assign batch
          if (row.batch && batchMap[row.batch.trim()]) {
            studentData.batchId = batchMap[row.batch.trim()]._id;
          }

          // Assign elective
          if (row.electiveChoice) {
            const electiveId = electiveOptionMap[row.electiveChoice.toLowerCase().trim()];
            if (electiveId) {
              studentData.selectedElective = electiveId;
            } else {
              result.warnings.push(
                `Row ${rowIndex} (${row.name}): elective "${row.electiveChoice}" not found in created items`
              );
            }
          }

          student = await User.create(studentData);

          // Add student to the batch's studentIds array
          if (studentData.batchId) {
            await Batch.findByIdAndUpdate(studentData.batchId, {
              $addToSet: { studentIds: student._id },
            });
          }

          result.studentsCreated.push({
            _id: student._id,
            name: student.name,
            enrollmentNo: student.enrollmentNo,
            batch: row.batch || 'None',
          });
        }
      } catch (err) {
        result.studentsFailed.push({
          row: rowIndex,
          name: row.name || 'UNKNOWN',
          reason: err.message,
        });
      }
    }

    logger.info('Bulk setup complete', {
      semesterId: semester._id,
      studentsCreated: result.studentsCreated.length,
      studentsFailed: result.studentsFailed.length,
      clearanceItemsCreated: result.clearanceItemsCreated.length,
      batchesCreated: result.batchesCreated.length,
      warnings: result.warnings.length,
    });

    return result;
  },

  /**
   * Clones a previous semester's structure (batches + clearance items)
   * into a new academic year, then imports a new student roster.
   */
  async cloneSemester({ sourceSemesterId, newAcademicYear, students, adminUser }) {
    const sourceSemester = await Semester.findById(sourceSemesterId).populate('programId');
    if (!sourceSemester) {
      throw AppError.notFound('Source semester not found');
    }

    // Load source batches and clearance items
    const sourceBatches = await Batch.find({ semesterId: sourceSemesterId });
    const sourceClearanceItems = await ClearanceItem.find({ semesterId: sourceSemesterId })
      .populate('theoryTeacherId', 'email')
      .populate('labBatchTeachers.teacherId', 'email')
      .populate('electiveOptions.teacherId', 'email');

    // Build clearance items in the normalized format
    const clearanceItems = sourceClearanceItems.map((ci) => {
      const item = {
        srNo: ci.srNo,
        title: ci.title,
        type: ci.type,
        subjectCode: ci.subjectCode,
        isRequired: ci.isRequired,
      };

      if (ci.type === 'theory' || ci.type === 'special') {
        item.teacherEmail = ci.theoryTeacherId?.email || '';
      }

      if (ci.type === 'lab') {
        item.labBatches = ci.labBatchTeachers.map((lbt) => {
          const sourceBatch = sourceBatches.find(
            (b) => b._id.toString() === lbt.batchId?.toString()
          );
          return {
            batchName: sourceBatch?.name || 'Unknown',
            teacherEmail: lbt.teacherId?.email || '',
          };
        });
      }

      if (ci.type === 'elective') {
        item.electiveGroup = ci.electiveGroup;
        item.electiveOptions = ci.electiveOptions.map((opt) => ({
          name: opt.name,
          teacherEmail: opt.teacherId?.email || '',
        }));
      }

      return item;
    });

    // Determine the new semester type
    const semType = sourceSemester.semNumber % 2 === 1 ? 'ODD' : 'EVEN';

    const semesterConfig = {
      programCode: sourceSemester.programId?.code || '',
      semNumber: sourceSemester.semNumber,
      academicYear: newAcademicYear,
      type: semType,
      startDate: new Date(),
      endDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
      clearanceDeadline: new Date(Date.now() + 140 * 24 * 60 * 60 * 1000),
    };

    return this.bulkSetupSemester({
      semesterConfig,
      clearanceItems,
      students: students || [],
      adminUser,
    });
  },

  /**
   * Generates the template structure that the frontend can use
   * to let users download a pre-filled Excel template.
   */
  getTemplateStructure(programCode) {
    return {
      semesterConfig: {
        columns: [
          'program_code',
          'sem_number',
          'academic_year',
          'type',
          'start_date',
          'end_date',
          'clearance_deadline',
        ],
        sampleRow: [
          programCode || 'AIDS',
          5,
          '2025-26',
          'ODD',
          '2025-07-15',
          '2025-12-15',
          '2025-12-01',
        ],
      },
      clearanceItems: {
        columns: [
          'sr_no',
          'title',
          'type',
          'subject_code',
          'teacher_email',
          'lab_batches',
          'elective_group',
          'elective_options',
        ],
        sampleRows: [
          [1, 'Data Science', 'theory', 'CS501', 'prof.sharma@college.edu', '', '', ''],
          [
            2,
            'AI Lab',
            'lab',
            'CS502L',
            '',
            'Batch A:prof.jones@college.edu,Batch B:prof.smith@college.edu',
            '',
            '',
          ],
          [
            3,
            'Open Elective II',
            'elective',
            'OEC201',
            '',
            '',
            'OEC-II',
            'Deep Learning:prof.dl@college.edu,NLP:prof.nlp@college.edu',
          ],
        ],
      },
      students: {
        columns: [
          'enrollment_no',
          'full_name',
          'email',
          'section',
          'batch',
          'elective_choice',
        ],
        sampleRows: [
          ['2024AIDS001', 'Rahul Sharma', 'rahul@college.edu', 'A', 'Batch A', 'Deep Learning'],
          ['2024AIDS002', 'Priya Patel', 'priya@college.edu', 'A', 'Batch B', 'NLP'],
        ],
      },
    };
  },

  /**
   * Parses the structured JSON payload from the frontend (which has already
   * parsed the Excel on the client-side or sent raw CSV data).
   * Normalizes the data into the format expected by bulkSetupSemester.
   */
  parsePayload(payload) {
    const { semesterConfig, clearanceItems, students } = payload;

    const programCode = semesterConfig?.programCode || semesterConfig?.program_code;
    const semNumber = semesterConfig?.semNumber || semesterConfig?.sem_number;
    const academicYear = semesterConfig?.academicYear || semesterConfig?.academic_year;

    if (!semesterConfig || !programCode || !semNumber || !academicYear) {
      throw AppError.badRequest('Semester configuration is incomplete. Need programCode, semNumber, and academicYear.');
    }

    // Helper to find value across aliases and case variations
    const getVal = (obj, ...keys) => {
      if (!obj || typeof obj !== 'object') return '';
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
          return obj[k];
        }
        const foundKey = Object.keys(obj).find((actual) => actual.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, ''));
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && String(obj[foundKey]).trim() !== '') {
          return obj[foundKey];
        }
      }
      return '';
    };

    // Normalize clearance items
    const normalizedItems = (clearanceItems || []).map((item, idx) => {
      const title = String(getVal(item, 'title', 'subject_name', 'subject', 'course_title', 'name') || '').trim();
      let type = String(getVal(item, 'type', 'course_type', 'item_type') || 'theory').toLowerCase().trim();
      if (!['theory', 'lab', 'elective', 'special'].includes(type)) {
        if (type.includes('lab') || type.includes('practical')) type = 'lab';
        else if (type.includes('elec')) type = 'elective';
        else if (type.includes('proj') || type.includes('special')) type = 'special';
        else type = 'theory';
      }

      const normalized = {
        srNo: parseInt(getVal(item, 'srNo', 'sr_no', 'sr') || idx + 1, 10),
        title,
        type,
        subjectCode: String(getVal(item, 'subjectCode', 'subject_code', 'code', 'course_code') || '').trim(),
        teacherEmail: String(getVal(item, 'teacherEmail', 'teacher_email', 'faculty_email', 'teacher', 'faculty') || '').toLowerCase().trim(),
        isRequired: item.isRequired !== false,
      };

      // Helper to parse key:email strings with any delimiter (, ; \n)
      const parseKeyEmailPairs = (str, keyProp) => {
        if (!str || typeof str !== 'string') return [];
        return str
          .split(/[,;\n]+/)
          .map((pair) => {
            const emailMatch = pair.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            const teacherEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : '';
            const keyName = pair.replace(emailMatch ? emailMatch[0] : '', '').replace(/[:=-]/g, '').trim();
            return { [keyProp]: keyName, teacherEmail };
          })
          .filter((p) => p[keyProp] && p.teacherEmail);
      };

      // Parse lab batches
      if (type === 'lab') {
        const rawLb = getVal(item, 'labBatches', 'lab_batches', 'batches', 'batch_teachers');
        if (Array.isArray(rawLb)) {
          normalized.labBatches = rawLb;
        } else if (typeof rawLb === 'string' && rawLb) {
          normalized.labBatches = parseKeyEmailPairs(rawLb, 'batchName');
        } else {
          normalized.labBatches = [];
        }
      }

      // Parse elective options
      if (type === 'elective') {
        normalized.electiveGroup = String(getVal(item, 'electiveGroup', 'elective_group', 'group') || 'Elective').trim();
        const rawEo = getVal(item, 'electiveOptions', 'elective_options', 'options');
        if (Array.isArray(rawEo)) {
          normalized.electiveOptions = rawEo;
        } else if (typeof rawEo === 'string' && rawEo) {
          normalized.electiveOptions = parseKeyEmailPairs(rawEo, 'name');
        } else {
          normalized.electiveOptions = [];
        }
      }

      return normalized;
    }).filter((item) => item.title !== '');

    // Normalize students
    const normalizedStudents = (students || []).map((s) => ({
      enrollmentNo: String(getVal(s, 'enrollmentNo', 'enrollment_no', 'roll_no', 'rollNo', 'enrolment_no', 'student_id') || '').trim(),
      name: String(getVal(s, 'name', 'full_name', 'student_name', 'studentName') || '').trim(),
      email: String(getVal(s, 'email', 'student_email', 'mail') || '').toLowerCase().trim(),
      section: String(getVal(s, 'section', 'sec') || 'A').trim(),
      batch: String(getVal(s, 'batch', 'practical_batch', 'lab_batch') || '').trim(),
      electiveChoice: String(getVal(s, 'electiveChoice', 'elective_choice', 'elective', 'subject_choice') || '').trim(),
    })).filter((s) => s.email !== '');

    return {
      semesterConfig: {
        programCode: String(getVal(semesterConfig, 'programCode', 'program_code', 'program', 'branch', 'code') || '').toUpperCase().trim(),
        semNumber: parseInt(getVal(semesterConfig, 'semNumber', 'sem_number', 'semester', 'sem') || 1, 10),
        academicYear: String(getVal(semesterConfig, 'academicYear', 'academic_year', 'session', 'year') || '').trim(),
        type: String(getVal(semesterConfig, 'type', 'term_type', 'semester_type') || '').toUpperCase() || undefined,
        startDate: getVal(semesterConfig, 'startDate', 'start_date') || undefined,
        endDate: getVal(semesterConfig, 'endDate', 'end_date') || undefined,
        clearanceDeadline: getVal(semesterConfig, 'clearanceDeadline', 'clearance_deadline', 'deadline') || undefined,
      },
      clearanceItems: normalizedItems,
      students: normalizedStudents,
    };
  },
};

module.exports = bulkSetupService;
