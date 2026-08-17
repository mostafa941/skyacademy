import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoomSchedule {
  teacher?: mongoose.Types.ObjectId;
  teacherName?: string;
  teacherType?: 'teacher' | 'trainer';
  subjectName?: string;
  stage?: string;
  grade?: string;
  dayOfWeek: string; // e.g. "الأحد", "الإثنين"
  startTime: string; // e.g. "14:00"
  endTime: string;   // e.g. "16:00"
}

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  capacity?: number;
  schedule: IRoomSchedule[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    capacity: {
      type: Number,
      default: 30,
    },
    schedule: [
      {
        teacher: {
          type: Schema.Types.ObjectId,
          ref: 'Teacher',
        },
        teacherName: { type: String, trim: true },
        teacherType: { type: String, trim: true },
        subjectName: { type: String, trim: true },
        stage: { type: String, trim: true },
        grade: { type: String, trim: true },
        dayOfWeek: { type: String, required: true, trim: true },
        startTime: { type: String, required: true, trim: true },
        endTime: { type: String, required: true, trim: true },
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default Room;
