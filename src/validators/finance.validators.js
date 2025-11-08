import Joi from 'joi';

export const salesOrderCreateSchema = Joi.object({
  customer: Joi.string().min(2).required(),
  project: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().allow('', null),
}).required();

export const purchaseOrderCreateSchema = Joi.object({
  vendor: Joi.string().min(2).required(),
  project: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().allow('', null),
}).required();

export const customerInvoiceCreateSchema = Joi.object({
  customer: Joi.string().min(2).required(),
  project: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required(),
  salesOrder: Joi.string().hex().length(24).allow('', null),
  date: Joi.date().optional(),
}).required();

export const vendorBillCreateSchema = Joi.object({
  vendor: Joi.string().min(2).required(),
  project: Joi.string().hex().length(24).required(),
  amount: Joi.number().positive().required(),
  purchaseOrder: Joi.string().hex().length(24).allow('', null),
  date: Joi.date().optional(),
}).required();
