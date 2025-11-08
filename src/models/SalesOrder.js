import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String },
    status: { type: String, enum: ['Draft', 'Confirmed', 'Paid'], default: 'Draft', index: true },
    date: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
