import mongoose from 'mongoose';

const vendorBillSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    vendor: { type: String, required: true },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending', index: true },
    date: { type: Date, default: () => new Date() },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export const VendorBill = mongoose.model('VendorBill', vendorBillSchema);
