import mongoose from 'mongoose';

const clearanceItemSchema = new mongoose.Schema(
  {
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester is required'],
      index: true,
    },
    srNo: {
      type: Number,
      required: [true, 'Serial number is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['theory', 'lab', 'elective', 'special'],
        message: '{VALUE} is not a valid clearance item type',
      },
      required: [true, 'Type is required'],
    },
    subjectCode: {
      type: String,
      trim: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },

    // ── Required if type is theory or special ──
    theoryTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.type === 'theory' || this.type === 'special';
      },
    },

    // ── Required if type is lab ──
    labBatchTeachers: {
      type: [
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
      ],
      validate: {
        validator: function (value) {
          if (this.type === 'lab') return value && value.length >= 1;
          return true;
        },
        message: 'Lab items must have at least one batch-teacher assignment',
      },
    },

    // ── Required if type is elective ──
    electiveGroup: {
      type: String,
      trim: true,
      required: function () {
        return this.type === 'elective';
      },
    },
    electiveOptions: {
      type: [
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
        },
      ],
      validate: {
        validator: function (value) {
          if (this.type === 'elective') return value && value.length >= 2;
          return true;
        },
        message: 'Elective items must have at least 2 options',
      },
    },
  },
  { timestamps: true }
);

const ClearanceItem = mongoose.model('ClearanceItem', clearanceItemSchema);

export default ClearanceItem;
