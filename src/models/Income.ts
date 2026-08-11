import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIncome extends Document {
  _id: mongoose.Types.ObjectId;
  amount: number;
  date: string; // YYYY-MM-DD
  reason: string;
  subscriberName?: string;
  staffType?: 'teacher' | 'trainer';
  teacher?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    subscriberName: {
      type: String,
      trim: true,
    },
    staffType: {
      type: String,
      enum: ['teacher', 'trainer'],
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
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

IncomeSchema.index({ date: -1 });
IncomeSchema.index({ teacher: 1 });

const Income: Model<IIncome> =
  mongoose.models.Income || mongoose.model<IIncome>('Income', IncomeSchema);

export default Income;
