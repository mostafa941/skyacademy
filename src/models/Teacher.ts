import mongoose, { Schema, Document, Model } from 'mongoose';

export type StaffType = 'teacher' | 'trainer';

export interface ITeacher extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  type: StaffType;
  subjectName: string;
  room?: mongoose.Types.ObjectId;
  teacherPercentage: number;
  academyPercentage: number;
  balance: number; // Positive = Academy owes staff, Negative = Loan/borrowed
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['teacher', 'trainer'],
      default: 'teacher',
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    teacherPercentage: {
      type: Number,
      default: 50,
    },
    academyPercentage: {
      type: Number,
      default: 50,
    },
    balance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

TeacherSchema.index({ phone: 1 });
TeacherSchema.index({ type: 1 });

const Teacher: Model<ITeacher> =
  mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);

export default Teacher;
