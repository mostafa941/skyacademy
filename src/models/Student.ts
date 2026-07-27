import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGradeScore {
  title: string;
  score: number;
  maxScore: number;
  date?: string;
}

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  parentPhone: string;
  subjectName: string;
  teacher?: mongoose.Types.ObjectId;
  grade: string;
  monthlyFee: number;
  notes?: string;
  grades?: IGradeScore[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
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
    parentPhone: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    monthlyFee: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    grades: [
      {
        title: { type: String, required: true },
        score: { type: Number, required: true },
        maxScore: { type: Number, default: 100 },
        date: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

StudentSchema.index({ phone: 1 });
StudentSchema.index({ parentPhone: 1 });
StudentSchema.index({ teacher: 1 });

const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student;
