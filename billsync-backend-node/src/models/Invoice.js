import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    product_name: String,
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    total_price: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoice_number: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    invoice_date: { type: Date, required: true },
    due_date: { type: Date },
    subtotal: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    total_amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
    notes: String,
    items: { type: [invoiceItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
