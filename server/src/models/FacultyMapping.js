const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      required: [true, 'Subject title is required'],
      trim: true,
    },
    teacherName: {
      type: String,
      required: [true, 'Assigned teacher name is required'],
      trim: true,
    },
    teacherEmail: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['theory', 'lab', 'elective', 'project', 'special'],
      default: 'theory',
    },
    isReRun: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      default: 'Assignments & Theory records',
    },
    status: {
      type: String,
      enum: ['Approved', 'Pending', 'Rejected'],
      default: 'Approved',
    },
  },
  { _id: true }
);

const semesterMappingSchema = new mongoose.Schema(
  {
    semNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    subjects: [subjectSchema],
  },
  { _id: false }
);

const sectionInchargeSchema = new mongoose.Schema(
  {
    sectionName: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // e.g. 'A', 'B', 'C'
    },
    classIncharge: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        default: '',
      },
      designation: {
        type: String,
        default: 'Assistant Professor & Class Incharge',
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
        default: '',
      },
    },
  },
  { _id: true }
);

const facultyMappingSchema = new mongoose.Schema(
  {
    branchCode: {
      type: String,
      required: [true, 'Branch code is required (e.g. CSE, IT, AIML)'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    branchName: {
      type: String,
      required: [true, 'Branch full name is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
    },
    hod: {
      name: {
        type: String,
        required: [true, 'HOD name is required'],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        default: '',
      },
      designation: {
        type: String,
        default: 'Professor & Head of Department',
        trim: true,
      },
      department: {
        type: String,
        trim: true,
      },
    },
    sections: [sectionInchargeSchema],
    semesters: [semesterMappingSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const FacultyMapping = mongoose.model('FacultyMapping', facultyMappingSchema);

module.exports = FacultyMapping;
