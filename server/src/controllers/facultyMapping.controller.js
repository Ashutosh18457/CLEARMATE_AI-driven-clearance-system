const FacultyMapping = require('../models/FacultyMapping');
const Program = require('../models/Program');
const Semester = require('../models/Semester');
const ClearanceItem = require('../models/ClearanceItem');
const User = require('../models/User');
const { sendSuccess, sendCreated } = require('../utils/response');
const AppError = require('../utils/AppError');

/**
 * Builds a dynamic, institutional faculty & subject mapping for a given Program.
 * Populates real subjects from ClearanceItem and real institutional teachers/HODs.
 */
async function buildDynamicMappingForProgram(program) {
  // 1. Resolve Semesters & Subjects from live database records
  const semesters = await Semester.find({ programId: program._id }).sort({ semNumber: 1 });
  const semesterIds = semesters.map((s) => s._id);

  const clearanceItems = await ClearanceItem.find({
    semesterId: { $in: semesterIds },
  })
    .populate('theoryTeacherId', 'name email')
    .populate('labBatchTeachers.teacherId', 'name email')
    .sort({ srNo: 1 });

  const itemsBySemester = {};
  clearanceItems.forEach((item) => {
    const sId = item.semesterId.toString();
    if (!itemsBySemester[sId]) itemsBySemester[sId] = [];
    itemsBySemester[sId].push(item);
  });

  const semestersData = semesters.map((sem) => {
    const semItems = itemsBySemester[sem._id.toString()] || [];
    const subjects = semItems.map((ci) => {
      const teacher = ci.theoryTeacherId || (ci.labBatchTeachers?.[0]?.teacherId);
      return {
        code: ci.subjectCode || '',
        title: ci.title || '',
        teacherName: teacher?.name || 'Assigned Faculty',
        teacherEmail: teacher?.email || `faculty.${program.code.toLowerCase()}@sbjit.edu.in`,
        type: ci.type || 'theory',
        isReRun: false,
        remarks: 'Assignments & practicals cleared',
        status: 'Approved',
      };
    });

    return {
      semNumber: sem.semNumber,
      subjects,
    };
  });

  // 2. Find genuine HOD / Department Admin / Faculty if available
  const hodUser =
    (await User.findOne({ role: 'hod', isActive: true })) ||
    (await User.findOne({ role: 'admin', isActive: true }));

  const teacherUser = await User.findOne({
    role: { $in: ['teacher', 'class_incharge'] },
    isActive: true,
  });

  const branchCode = program.code.toUpperCase();
  const branchName = program.name;
  const deptName = program.department || `Department of ${branchName}`;

  return {
    branchCode,
    branchName,
    department: deptName,
    hod: {
      name: hodUser?.name || 'Head of Department',
      email: hodUser?.email || `hod.${branchCode.toLowerCase()}@sbjit.edu.in`,
      designation: 'Professor & Head of Department',
      department: deptName,
    },
    sections: [
      {
        sectionName: 'A',
        classIncharge: {
          name: teacherUser?.name || 'Class Incharge (Sec A)',
          email: teacherUser?.email || `incharge.a.${branchCode.toLowerCase()}@sbjit.edu.in`,
          designation: 'Assistant Professor & Class Incharge (Sec A)',
          phone: '',
        },
      },
      {
        sectionName: 'B',
        classIncharge: {
          name: 'Class Incharge (Sec B)',
          email: `incharge.b.${branchCode.toLowerCase()}@sbjit.edu.in`,
          designation: 'Assistant Professor & Class Incharge (Sec B)',
          phone: '',
        },
      },
    ],
    semesters: semestersData,
    isActive: true,
  };
}

const facultyMappingController = {
  /**
   * @route GET /api/faculty-mappings
   * Returns all branch mappings, dynamically synchronized with registered programs
   */
  async getAllMappings(req, res, next) {
    try {
      const existingMappings = await FacultyMapping.find().sort({ branchCode: 1 });
      const programs = await Program.find({ isActive: { $ne: false } }).sort({ code: 1 });

      const existingCodes = new Set(existingMappings.map((m) => m.branchCode.toUpperCase()));
      const resultMappings = [...existingMappings];

      // Auto-initialize mappings for registered programs that don't have one yet
      for (const prog of programs) {
        if (!existingCodes.has(prog.code.toUpperCase())) {
          const dynamicData = await buildDynamicMappingForProgram(prog);
          const created = await FacultyMapping.create(dynamicData);
          resultMappings.push(created);
          existingCodes.add(prog.code.toUpperCase());
        }
      }

      sendSuccess(res, {
        data: resultMappings,
        message: 'Faculty mappings retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/faculty-mappings/:branchCode
   */
  async getByBranch(req, res, next) {
    try {
      const branchCode = req.params.branchCode.toUpperCase();
      let mapping = await FacultyMapping.findOne({ branchCode });

      if (!mapping) {
        const program = await Program.findOne({ code: branchCode });
        if (program) {
          const dynamicData = await buildDynamicMappingForProgram(program);
          mapping = await FacultyMapping.create(dynamicData);
        }
      }

      if (!mapping) {
        throw AppError.notFound(`No mapping found for branch: ${branchCode}`);
      }

      sendSuccess(res, { data: mapping, message: 'Branch mapping retrieved' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/faculty-mappings
   */
  async createMapping(req, res, next) {
    try {
      const { branchCode, branchName, department, hod, sections, semesters } = req.body;
      const existing = await FacultyMapping.findOne({ branchCode: branchCode.toUpperCase() });
      if (existing) {
        throw AppError.badRequest(`Branch mapping for ${branchCode} already exists.`);
      }
      const mapping = await FacultyMapping.create({
        branchCode: branchCode.toUpperCase(),
        branchName,
        department,
        hod,
        sections: sections || [],
        semesters: semesters || [],
      });
      sendCreated(res, { data: mapping, message: 'Branch mapping created successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route PUT /api/faculty-mappings/:id
   */
  async updateMapping(req, res, next) {
    try {
      const mapping = await FacultyMapping.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!mapping) {
        throw AppError.notFound('Faculty mapping not found');
      }
      sendSuccess(res, { data: mapping, message: 'Faculty mapping updated successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route DELETE /api/faculty-mappings/:id
   */
  async deleteMapping(req, res, next) {
    try {
      const mapping = await FacultyMapping.findByIdAndDelete(req.params.id);
      if (!mapping) {
        throw AppError.notFound('Faculty mapping not found');
      }
      sendSuccess(res, { message: 'Faculty mapping deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/faculty-mappings/seed-defaults
   * Synchronizes branch mappings with institutional programs and clearance items
   */
  async seedDefaults(req, res, next) {
    try {
      const programs = await Program.find({ isActive: { $ne: false } }).sort({ code: 1 });
      const validCodes = programs.map((p) => p.code.toUpperCase());

      // Remove orphaned mappings that do not correspond to any registered program
      await FacultyMapping.deleteMany({ branchCode: { $nin: validCodes } });

      const syncedMappings = [];
      for (const prog of programs) {
        const dynamicData = await buildDynamicMappingForProgram(prog);
        const updated = await FacultyMapping.findOneAndUpdate(
          { branchCode: prog.code.toUpperCase() },
          dynamicData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        syncedMappings.push(updated);
      }

      sendSuccess(res, {
        data: syncedMappings,
        message: 'Faculty mappings successfully synchronized with institutional programs & clearance items',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route POST /api/faculty-mappings/sync/:branchCode
   * Re-pulls live clearance items for a specific branch and updates its semester subjects
   */
  async syncWithClearanceItems(req, res, next) {
    try {
      const branchCode = req.params.branchCode.toUpperCase();
      const program = await Program.findOne({ code: branchCode });
      if (!program) {
        throw AppError.notFound(`Program with branch code ${branchCode} not found`);
      }

      const semesters = await Semester.find({ programId: program._id }).sort({ semNumber: 1 });
      const semesterIds = semesters.map((s) => s._id);

      const clearanceItems = await ClearanceItem.find({
        semesterId: { $in: semesterIds },
      })
        .populate('theoryTeacherId', 'name email')
        .populate('labBatchTeachers.teacherId', 'name email')
        .sort({ srNo: 1 });

      const itemsBySemester = {};
      clearanceItems.forEach((item) => {
        const sId = item.semesterId.toString();
        if (!itemsBySemester[sId]) itemsBySemester[sId] = [];
        itemsBySemester[sId].push(item);
      });

      const semestersData = semesters.map((sem) => {
        const semItems = itemsBySemester[sem._id.toString()] || [];
        const subjects = semItems.map((ci) => {
          const teacher = ci.theoryTeacherId || (ci.labBatchTeachers?.[0]?.teacherId);
          return {
            code: ci.subjectCode || '',
            title: ci.title || '',
            teacherName: teacher?.name || 'Assigned Faculty',
            teacherEmail: teacher?.email || `faculty.${program.code.toLowerCase()}@sbjit.edu.in`,
            type: ci.type || 'theory',
            isReRun: false,
            remarks: 'Assignments & practicals cleared',
            status: 'Approved',
          };
        });

        return {
          semNumber: sem.semNumber,
          subjects,
        };
      });

      const mapping = await FacultyMapping.findOneAndUpdate(
        { branchCode },
        { semesters: semestersData },
        { new: true }
      );

      if (!mapping) {
        throw AppError.notFound(`Faculty mapping for ${branchCode} not found`);
      }

      sendSuccess(res, {
        data: mapping,
        message: `Subjects for ${branchCode} synced with live clearance items successfully`,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = {
  facultyMappingController,
};
