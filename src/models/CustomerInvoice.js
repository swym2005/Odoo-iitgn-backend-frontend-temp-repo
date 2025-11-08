import mongoose from 'mongoose';

const customerInvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    customer: { type: String, required: true },
    salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Draft', 'Paid'], default: 'Draft', index: true },
    date: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const CustomerInvoice = mongoose.model('CustomerInvoice', customerInvoiceSchema);
