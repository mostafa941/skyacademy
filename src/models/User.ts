import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'admin' | 'teacher' | 'secretary' | 'student';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone: string;
  password?: string;
  role: UserRole;
  subjectName?: string; // For teachers
  grade?: string; // For students
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'teacher', 'secretary', 'student'],
      required: true,
    },
    subjectName: {
      type: String,
      trim: true,
    },
    grade: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index or individual indices for fast logins
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
