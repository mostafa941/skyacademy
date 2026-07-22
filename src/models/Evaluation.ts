import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvaluation extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  subject?: mongoose.Types.ObjectId;
  rating: number; // 1 to 5 stars
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationSchema = new Schema<IEvaluation>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    notes: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

EvaluationSchema.index({ student: 1 });
EvaluationSchema.index({ teacher: 1 });

const Evaluation: Model<IEvaluation> = mongoose.models.Evaluation || mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);

export default Evaluation;
