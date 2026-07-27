import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  amount: number;
  date: string; // YYYY-MM-DD
  reason: string;
  type: 'general' | 'teacher_loan'; // سلفة مدرس/مدرب أو مصروف عام
  teacher?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
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
    type: {
      type: String,
      enum: ['general', 'teacher_loan'],
      default: 'general',
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

ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ teacher: 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;
