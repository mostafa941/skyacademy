import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  teacher?: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  amount: number; // Paid amount
  paymentType?: 'session' | 'monthly'; // حصة أو شهر
  paymentReason?: string; // سبب الدفع
  remainingAmount?: number; // المبلغ المتبقي
  remainingReason?: string; // سبب الفلوس المتبقية
  status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
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
    paymentType: {
      type: String,
      enum: ['session', 'monthly'],
      default: 'monthly',
    },
    paymentReason: {
      type: String,
      trim: true,
      default: 'اشتراك شهري',
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    remainingReason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid', 'partial'],
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

PaymentSchema.index({ student: 1, month: 1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
