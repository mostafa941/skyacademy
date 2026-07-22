import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEnrollment extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId; // References User (role: student)
  subject: mongoose.Types.ObjectId; // References Subject
  score?: number;
  maxScore?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate enrollment for same student and subject
EnrollmentSchema.index({ student: 1, subject: 1 }, { unique: true });

const Enrollment: Model<IEnrollment> = mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

export default Enrollment;
