import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  grade: string;
  teacher?: mongoose.Types.ObjectId; // References User (role: teacher)
  teacherName?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    teacherName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
