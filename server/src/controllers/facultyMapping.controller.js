const FacultyMapping = require('../models/FacultyMapping');
const { sendSuccess, sendCreated } = require('../utils/response');
const AppError = require('../utils/AppError');

// Default initial university faculty mapping data
const DEFAULT_UNIVERSITY_MAPPINGS = [
  {
    branchCode: 'CSE',
    branchName: 'Computer Science & Engineering',
    department: 'Department of Computer Science & Engineering',
    hod: {
      name: 'Dr. Kulkarni',
      email: 'hod.cse@clearmate.edu',
      designation: 'Professor & Head of Department',
      department: 'Department of Computer Science & Engineering',
    },
    sections: [
      {
        sectionName: 'A',
        classIncharge: {
          name: 'Prof. Sharma',
          email: 'sharma.cse@clearmate.edu',
          designation: 'Assistant Professor & Class Incharge (Sec A)',
          phone: '+91 98231 00001',
        },
      },
      {
        sectionName: 'B',
        classIncharge: {
          name: 'Prof. Anjali Mehta',
          email: 'mehta.cse@clearmate.edu',
          designation: 'Assistant Professor & Class Incharge (Sec B)',
          phone: '+91 98231 00002',
        },
      },
    ],
    semesters: [
      {
        semNumber: 5,
        subjects: [
          { code: 'CS501', title: 'Database Management Systems (DBMS)', teacherName: 'Prof. Sharma', type: 'theory', remarks: 'Theory records & assignments verified' },
          { code: 'CS502', title: 'Computer Networks (CN)', teacherName: 'Prof. K. Verma', type: 'theory', remarks: 'Assignments & viva cleared' },
          { code: 'CS503', title: 'Theory of Computation (TOC)', teacherName: 'Prof. S. Mehta', type: 'theory', remarks: 'Tutorials & mini assignment cleared' },
          { code: 'CS504L', title: 'DBMS Laboratory', teacherName: 'Prof. Gupta', type: 'lab', remarks: 'Lab practicals & project sign-off' },
        ],
      },
      {
        semNumber: 6,
        subjects: [
          { code: 'CS601', title: 'Theory of Computation', teacherName: 'Prof. Sharma', type: 'theory', remarks: 'Assignments & Theory records' },
          { code: 'CS602', title: 'Data Analytics & AI Lab', teacherName: 'Prof. Gupta', type: 'lab', remarks: 'Lab practicals & project sign-off' },
          { code: 'CS603', title: 'Compiler Design', teacherName: 'Prof. K. Verma', type: 'theory', remarks: 'Term work submitted' },
        ],
      },
      {
        semNumber: 7,
        subjects: [
          { code: 'CS701', title: 'Distributed Systems & Cloud', teacherName: 'Prof. Sharma', type: 'theory', remarks: 'Course work completed' },
          { code: 'CS702', title: 'Major Project Phase-I', teacherName: 'Prof. Kulkarni', type: 'project', remarks: 'Synopsis & prototype accepted' },
        ],
      },
    ],
  },
  {
    branchCode: 'IT',
    branchName: 'Information Technology',
    department: 'Department of Information Technology',
    hod: {
      name: 'Dr. Deshmukh',
      email: 'hod.it@clearmate.edu',
      designation: 'Professor & Head of Department',
      department: 'Department of Information Technology',
    },
    sections: [
      {
        sectionName: 'A',
        classIncharge: {
          name: 'Prof. Patil',
          email: 'patil.it@clearmate.edu',
          designation: 'Associate Professor & Class Incharge (Sec A)',
          phone: '+91 98231 00011',
        },
      },
      {
        sectionName: 'B',
        classIncharge: {
          name: 'Prof. Rajesh K.',
          email: 'rajesh.it@clearmate.edu',
          designation: 'Assistant Professor & Class Incharge (Sec B)',
          phone: '+91 98231 00012',
        },
      },
    ],
    semesters: [
      {
        semNumber: 5,
        subjects: [
          { code: 'IT501', title: 'Web Technologies & Frameworks', teacherName: 'Prof. Patil', type: 'theory', remarks: 'Assignments & practical cleared' },
          { code: 'IT502', title: 'Cloud Computing & DevOps', teacherName: 'Prof. S. Joshi', type: 'theory', remarks: 'Cloud lab tasks verified' },
          { code: 'IT503', title: 'Information & Cyber Security', teacherName: 'Prof. N. Deshmukh', type: 'theory', remarks: 'Audit assignment submitted' },
          { code: 'IT504L', title: 'Web Tech Laboratory', teacherName: 'Prof. Patil', type: 'lab', remarks: 'Lab journal verified' },
        ],
      },
      {
        semNumber: 6,
        subjects: [
          { code: 'IT601', title: 'Full Stack Development', teacherName: 'Prof. Patil', type: 'theory', remarks: 'Module assessment complete' },
          { code: 'IT602', title: 'Big Data Engineering', teacherName: 'Prof. S. Joshi', type: 'theory', remarks: 'Assignments verified' },
        ],
      },
    ],
  },
  {
    branchCode: 'AIML',
    branchName: 'Artificial Intelligence & Machine Learning',
    department: 'Department of Emerging Technologies',
    hod: {
      name: 'Dr. Singh',
      email: 'hod.aiml@clearmate.edu',
      designation: 'Professor & Head of Department',
      department: 'Department of Emerging Technologies',
    },
    sections: [
      {
        sectionName: 'A',
        classIncharge: {
          name: 'Prof. Verma',
          email: 'verma.aiml@clearmate.edu',
          designation: 'Associate Professor & Class Incharge (Sec A)',
          phone: '+91 98231 00021',
        },
      },
      {
        sectionName: 'B',
        classIncharge: {
          name: 'Prof. Sneha Roy',
          email: 'roy.aiml@clearmate.edu',
          designation: 'Assistant Professor & Class Incharge (Sec B)',
          phone: '+91 98231 00022',
        },
      },
    ],
    semesters: [
      {
        semNumber: 5,
        subjects: [
          { code: 'AI501', title: 'Machine Learning (ML)', teacherName: 'Prof. Verma', type: 'theory', remarks: 'Model implementations verified' },
          { code: 'AI502', title: 'Deep Learning Architectures (DL)', teacherName: 'Prof. P. Gupta', type: 'theory', remarks: 'Neural network projects signed off' },
          { code: 'AI503', title: 'Natural Language Processing (NLP)', teacherName: 'Dr. Singh', type: 'theory', remarks: 'Transformer labs cleared' },
          { code: 'AI504L', title: 'AI/ML Practical Laboratory', teacherName: 'Prof. Verma', type: 'lab', remarks: 'GitHub repos and reports evaluated' },
        ],
      },
      {
        semNumber: 6,
        subjects: [
          { code: 'AI601', title: 'Reinforcement Learning & Robotics', teacherName: 'Prof. Verma', type: 'theory', remarks: 'Simulation experiments cleared' },
          { code: 'AI602', title: 'Computer Vision & GenAI', teacherName: 'Prof. P. Gupta', type: 'theory', remarks: 'Vision lab tasks verified' },
        ],
      },
    ],
  },
  {
    branchCode: 'CIVIL',
    branchName: 'Civil Engineering',
    department: 'Department of Civil Engineering',
    hod: {
      name: 'Dr. A. Verma',
      email: 'hod.civil@clearmate.edu',
      designation: 'Professor & Head of Department',
      department: 'Department of Civil Engineering',
    },
    sections: [
      {
        sectionName: 'A',
        classIncharge: {
          name: 'Prof. Joshi',
          email: 'joshi.civil@clearmate.edu',
          designation: 'Assistant Professor & Class Incharge (Sec A)',
          phone: '+91 98231 00031',
        },
      },
    ],
    semesters: [
      {
        semNumber: 5,
        subjects: [
          { code: 'CE501', title: 'Structural Analysis-II', teacherName: 'Prof. Joshi', type: 'theory', remarks: 'Calculation sheets verified' },
          { code: 'CE502', title: 'Geotechnical Engineering', teacherName: 'Prof. R. Dave', type: 'theory', remarks: 'Soil sample tests evaluated' },
          { code: 'CE503', title: 'Surveying & GIS', teacherName: 'Dr. A. Verma', type: 'theory', remarks: 'Field survey maps submitted' },
          { code: 'CE504L', title: 'Structural Materials Lab', teacherName: 'Prof. Joshi', type: 'lab', remarks: 'Lab testing reports cleared' },
        ],
      },
    ],
  },
  {
    branchCode: 'MECHANICAL',
    branchName: 'Mechanical Engineering',
    department: 'Department of Mechanical Engineering',
    hod: {
      name: 'Dr. S. R. Patil',
      email: 'hod.mech@clearmate.edu',
      designation: 'Professor & Head of Department',
      department: 'Department of Mechanical Engineering',
    },
    sections: [
      {
        sectionName: 'A',
        classIncharge: {
          name: 'Prof. Rao',
          email: 'rao.mech@clearmate.edu',
          designation: 'Assistant Professor & Class Incharge (Sec A)',
          phone: '+91 98231 00041',
        },
      },
    ],
    semesters: [
      {
        semNumber: 5,
        subjects: [
          { code: 'ME501', title: 'Heat Transfer & Thermodynamics', teacherName: 'Prof. Rao', type: 'theory', remarks: 'Assignments & term tests cleared' },
          { code: 'ME502', title: 'Design of Machine Elements', teacherName: 'Prof. S. R. Patil', type: 'theory', remarks: 'CAD sheets submitted' },
          { code: 'ME503', title: 'Fluid Mechanics & Machinery', teacherName: 'Prof. M. Shinde', type: 'theory', remarks: 'Practical journals verified' },
        ],
      },
    ],
  },
];

const facultyMappingController = {
  /**
   * @route GET /api/faculty-mappings
   * Returns all branch mappings (with fallback auto-seed if empty)
   */
  async getAllMappings(req, res, next) {
    try {
      let mappings = await FacultyMapping.find().sort({ branchCode: 1 });
      if (mappings.length === 0) {
        mappings = await FacultyMapping.insertMany(DEFAULT_UNIVERSITY_MAPPINGS);
      }
      sendSuccess(res, { data: mappings, message: 'Faculty mappings retrieved successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * @route GET /api/faculty-mappings/:branchCode
   */
  async getByBranch(req, res, next) {
    try {
      const { branchCode } = req.params;
      let mapping = await FacultyMapping.findOne({ branchCode: branchCode.toUpperCase() });
      if (!mapping) {
        const fallback = DEFAULT_UNIVERSITY_MAPPINGS.find(
          (m) => m.branchCode.toUpperCase() === branchCode.toUpperCase()
        );
        if (fallback) {
          mapping = await FacultyMapping.create(fallback);
        } else {
          throw AppError.notFound(`No mapping found for branch: ${branchCode}`);
        }
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
   * Resets and re-seeds the default university faculty mappings
   */
  async seedDefaults(req, res, next) {
    try {
      await FacultyMapping.deleteMany({});
      const mappings = await FacultyMapping.insertMany(DEFAULT_UNIVERSITY_MAPPINGS);
      sendSuccess(res, { data: mappings, message: 'Default university faculty mappings restored successfully' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = {
  facultyMappingController,
  DEFAULT_UNIVERSITY_MAPPINGS,
};
