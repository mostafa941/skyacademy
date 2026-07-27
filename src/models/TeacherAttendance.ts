import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacherAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'excused';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherAttendanceSchema = new Schema<ITeacherAttendance>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'excused'],
      default: 'present',
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

TeacherAttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });

const TeacherAttendance: Model<ITeacherAttendance> =
  mongoose.models.TeacherAttendance ||
  mongoose.model<ITeacherAttendance>('TeacherAttendance', TeacherAttendanceSchema);

export default TeacherAttendance;
