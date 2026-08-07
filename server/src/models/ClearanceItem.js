const mongoose = require('mongoose');

const clearanceItemTypes = ['theory', 'lab', 'elective', 'special'];

// Embedded sub-schema for lab batches (each batch has a specific teacher)
const labBatchTeacherSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
);

// Embedded sub-schema for elective options (student picks one, gets that teacher)
const electiveOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }
); // Mongoose automatically adds an _id here, which is useful for 'selectedElective' on the User model

const clearanceItemSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester ID is required'],
      index: true,
    },
    srNo: {
      type: Number,
      required: [true, 'Serial number is required for display order'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      example: 'Theory of Computation',
    },
    type: {
      type: String,
      enum: clearanceItemTypes,
      required: [true, 'Item type is required'],
    },
    subjectCode: {
      type: String,
      trim: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    
    // ----------------------------------------------------
    // RESOLUTION LOGIC DATA
    // ----------------------------------------------------
    
    // 1. For Theory & Special items (one teacher for all students in the semester)
    theoryTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() { return this.type === 'theory' || this.type === 'special'; },
    },
    
    // 2. For Lab items (teacher depends on the student's batch)
    labBatchTeachers: {
      type: [labBatchTeacherSchema],
      validate: {
        validator: function(v) {
          if (this.type === 'lab') return v && v.length > 0;
          return true;
        },
        message: 'Lab items must have at least one batch-teacher mapping',
      },
    },
    
    // 3. For Elective items (student chooses one option, which maps to a teacher)
    isElective: {
      type: Boolean,
      default: function() { return this.type === 'elective'; },
    },
    electiveGroup: {
      type: String, // e.g. "OEC-II"
      required: function() { return this.type === 'elective'; },
    },
    electiveOptions: {
      type: [electiveOptionSchema],
      validate: {
        validator: function(v) {
          if (this.type === 'elective') return v && v.length >= 2;
          return true;
        },
        message: 'Elective items must have at least two options',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index to efficiently load all items for a semester sorted by order
clearanceItemSchema.index({ semesterId: 1, srNo: 1 });

const ClearanceItem = mongoose.model('ClearanceItem', clearanceItemSchema);

module.exports = ClearanceItem;
