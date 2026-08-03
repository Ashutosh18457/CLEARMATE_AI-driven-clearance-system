import mongoose from 'mongoose';

const itemClearanceSchema = new mongoose.Schema(
  {
    clearanceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceRequest',
      required: [true, 'Clearance request is required'],
      index: true,
    },
    clearanceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClearanceItem',
      required: [true, 'Clearance item is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
      index: true,
    },
    itemTitle: {
      type: String,
      trim: true,
    },
    itemType: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid item clearance status',
      },
      default: 'pending',
    },
    remarks: {
      type: String,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

itemClearanceSchema.index(
  { clearanceRequestId: 1, clearanceItemId: 1 },
  { unique: true }
);

const ItemClearance = mongoose.model('ItemClearance', itemClearanceSchema);

export default ItemClearance;
