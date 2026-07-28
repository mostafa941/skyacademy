import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacherPayout extends Document {
  _id: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  amount: number;
  month: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherPayoutSchema = new Schema<ITeacherPayout>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TeacherPayoutSchema.index({ teacher: 1, month: 1 });

const TeacherPayout: Model<ITeacherPayout> =
  mongoose.models.TeacherPayout ||
  mongoose.model<ITeacherPayout>('TeacherPayout', TeacherPayoutSchema);

export default TeacherPayout;
