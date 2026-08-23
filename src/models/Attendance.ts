import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  subjectName?: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'excused';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subjectName: {
      type: String,
      trim: true,
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

// Unique per student per day, fast date-range queries
AttendanceSchema.index({ student: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ status: 1 });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
