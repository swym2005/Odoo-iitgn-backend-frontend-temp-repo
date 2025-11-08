import { SalesOrder } from '../models/SalesOrder.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { CustomerInvoice } from '../models/CustomerInvoice.js';
import { VendorBill } from '../models/VendorBill.js';
import { Expense } from '../models/Expense.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const listSalesOrders = async () => {
  return SalesOrder.find().populate('project', 'name').sort({ createdAt: -1 }).lean();
};

let soCounter = 1000;
export const createSalesOrder = async ({ customer, project, amount, description }) => {
  const number = `SO-${++soCounter}`;
  return SalesOrder.create({ number, customer, project, amount, description, status: 'Draft' });
};

export const setSalesOrderStatus = async (id, status) => {
  const so = await SalesOrder.findById(id);
  if (!so) { const e = new Error('Sales Order not found'); e.status = 404; throw e; }
  so.status = status;
  await so.save();
  return so;
};

export const listPurchaseOrders = async () => {
  return PurchaseOrder.find().populate('project', 'name').sort({ createdAt: -1 }).lean();
};

let poCounter = 2000;
export const createPurchaseOrder = async ({ vendor, project, amount, description }) => {
  const number = `PO-${++poCounter}`;
  return PurchaseOrder.create({ number, vendor, project, amount, description, status: 'Draft' });
};

export const setPurchaseOrderStatus = async (id, status) => {
  const po = await PurchaseOrder.findById(id);
  if (!po) { const e = new Error('Purchase Order not found'); e.status = 404; throw e; }
  po.status = status;
  await po.save();
  return po;
};

export const listCustomerInvoices = async () => {
  return CustomerInvoice.find().populate('project', 'name').populate('salesOrder', 'number').sort({ createdAt: -1 }).lean();
};

let invCounter = 3000;
export const createCustomerInvoice = async ({ customer, project, amount, salesOrder, date }) => {
  const number = `INV-${++invCounter}`;
  return CustomerInvoice.create({ number, customer, project, amount, salesOrder: salesOrder || undefined, status: 'Draft', date: date ? new Date(date) : new Date() });
};

export const setInvoicePaid = async (id) => {
  const inv = await CustomerInvoice.findById(id);
  if (!inv) { const e = new Error('Invoice not found'); e.status = 404; throw e; }
  inv.status = 'Paid';
  await inv.save();
  return inv;
};

export const listVendorBills = async () => {
  return VendorBill.find().populate('project', 'name').populate('purchaseOrder', 'number').sort({ createdAt: -1 }).lean();
};

let billCounter = 4000;
export const createVendorBill = async ({ vendor, project, amount, purchaseOrder, date }, attachmentUrl) => {
  const number = `BILL-${++billCounter}`;
  return VendorBill.create({ number, vendor, project, amount, purchaseOrder: purchaseOrder || undefined, status: 'Pending', date: date ? new Date(date) : new Date(), attachmentUrl });
};

export const setVendorBillPaid = async (id) => {
  const bill = await VendorBill.findById(id);
  if (!bill) { const e = new Error('Vendor Bill not found'); e.status = 404; throw e; }
  bill.status = 'Paid';
  await bill.save();
  return bill;
};

export const financeDashboard = async () => {
  const [revAgg, billAgg, expAgg, outInvAgg, outBillAgg] = await Promise.all([
    CustomerInvoice.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    VendorBill.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    CustomerInvoice.aggregate([{ $match: { status: { $ne: 'Paid' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    VendorBill.aggregate([{ $match: { status: { $ne: 'Paid' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  const revenue = revAgg[0]?.total || 0;
  const billsCost = billAgg[0]?.total || 0;
  const expensesCost = expAgg[0]?.total || 0;
  const totalCost = billsCost + expensesCost;
  const grossProfit = revenue - totalCost;
  const outstandingPayments = (outInvAgg[0]?.total || 0) + (outBillAgg[0]?.total || 0);

  const costVsRevenueByProject = await Promise.all([
    CustomerInvoice.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: '$project', revenue: { $sum: '$amount' } } }]),
    VendorBill.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: '$project', cost: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$project', cost: { $sum: '$amount' } } }]),
  ]).then(([rev, bills, exps]) => {
    const map = new Map();
    for (const r of rev) map.set(String(r._id), { project: r._id, revenue: r.revenue, cost: 0 });
    for (const b of bills) {
      const key = String(b._id);
      const entry = map.get(key) || { project: b._id, revenue: 0, cost: 0 };
      entry.cost += b.cost;
      map.set(key, entry);
    }
    for (const e of exps) {
      const key = String(e._id);
      const entry = map.get(key) || { project: e._id, revenue: 0, cost: 0 };
      entry.cost += e.cost;
      map.set(key, entry);
    }
    return Array.from(map.values());
  });

  const vendorSpend = await VendorBill.aggregate([
    { $group: { _id: '$vendor', amount: { $sum: '$amount' } } },
    { $sort: { amount: -1 } },
  ]);

  return { revenue, totalCost, grossProfit, outstandingPayments, costVsRevenueByProject, vendorSpend };
};
