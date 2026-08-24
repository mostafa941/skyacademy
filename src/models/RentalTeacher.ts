import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRentalTeacher extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  subjectName: string;
  room?: mongoose.Types.ObjectId;
  roomName?: string;
  days: string[]; // e.g. ['السبت', 'الإثنين']
  startTime?: string; // e.g. "09:00"
  endTime?: string;   // e.g. "11:00"
  rentAmount: number; // Monthly rent value
  rentPeriod: 'monthly' | 'per_session'; // Per month or per session
  isPaid: boolean;
  lastPaidDate?: Date;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RentalTeacherSchema = new Schema<IRentalTeacher>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room' },
    roomName: { type: String, trim: true },
    days: { type: [String], default: [] },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    rentAmount: { type: Number, default: 0 },
    rentPeriod: {
      type: String,
      enum: ['monthly', 'per_session'],
      default: 'monthly',
    },
    isPaid: { type: Boolean, default: false },
    lastPaidDate: { type: Date },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RentalTeacherSchema.index({ phone: 1 });
RentalTeacherSchema.index({ isActive: 1 });

const RentalTeacher: Model<IRentalTeacher> =
  mongoose.models.RentalTeacher ||
  mongoose.model<IRentalTeacher>('RentalTeacher', RentalTeacherSchema);

export default RentalTeacher;
