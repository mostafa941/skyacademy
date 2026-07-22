import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  amount: number;
  status: 'paid' | 'unpaid';
  notes?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
    },
    notes: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ student: 1, month: 1 }, { unique: true });

const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
