import express from 'express';
import nodemailer from 'nodemailer';
import { Invoice } from '../models/Invoice.js';

const router = express.Router();

// Create invoice
router.post('/', async (req, res) => {
  try {
    const d = req.body || {};
    if (!d.invoice_number || !d.customer_id || !d.invoice_date || d.total_amount == null) {
      return res.status(400).json({ error: 'Missing fields: invoice_number, customer_id, invoice_date, total_amount' });
    }
    const inv = await Invoice.create({
      invoice_number: d.invoice_number,
      customer_id: d.customer_id,
      invoice_date: new Date(d.invoice_date),
      due_date: d.due_date ? new Date(d.due_date) : undefined,
      subtotal: Number(d.subtotal || 0),
      tax_amount: Number(d.tax_amount || 0),
      total_amount: Number(d.total_amount),
      status: d.status || 'pending',
      notes: d.notes,
      items: Array.isArray(d.items) ? d.items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        total_price: Number(it.total_price),
      })) : [],
    });
    return res.status(201).json(inv);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// List invoices
router.get('/', async (req, res) => {
  try {
    // Support optional pagination params but always return a plain array for
    // backward compatibility with the frontend, which expects an array.
    let page = parseInt(req.query.page || '1', 10);
    let per_page = parseInt(req.query.per_page || '10', 10);
    if (page < 1) page = 1;
    if (per_page < 1 || per_page > 100) per_page = 10;
    const skip = (page - 1) * per_page;

    const items = await Invoice.find({})
      .skip(skip)
      .limit(per_page)
      .sort({ createdAt: -1 });

    return res.json(items);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    return res.json(inv);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Update invoice
router.put('/:id', async (req, res) => {
  try {
    const d = req.body || {};
    const inv = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          invoice_number: d.invoice_number,
          customer_id: d.customer_id,
          invoice_date: d.invoice_date ? new Date(d.invoice_date) : undefined,
          due_date: d.due_date ? new Date(d.due_date) : undefined,
          subtotal: d.subtotal != null ? Number(d.subtotal) : undefined,
          tax_amount: d.tax_amount != null ? Number(d.tax_amount) : undefined,
          total_amount: d.total_amount != null ? Number(d.total_amount) : undefined,
          status: d.status,
          notes: d.notes,
          items: Array.isArray(d.items)
            ? d.items.map(it => ({
                product_id: it.product_id,
                product_name: it.product_name,
                quantity: Number(it.quantity),
                unit_price: Number(it.unit_price),
                total_price: Number(it.total_price),
              }))
            : undefined,
        },
      },
      { new: true }
    );
    if (!inv) return res.status(404).json({ error: 'Not found' });
    return res.json(inv);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const inv = await Invoice.findByIdAndDelete(req.params.id);
    if (!inv) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Invoice deleted successfully' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Mark as paid
router.patch('/:id/paid', async (req, res) => {
  try {
    const inv = await Invoice.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'paid' } },
      { new: true }
    );
    if (!inv) return res.status(404).json({ error: 'Not found' });
    return res.json(inv);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Stats
router.get('/stats', async (_req, res) => {
  try {
    const [count, totals] = await Promise.all([
      Invoice.countDocuments({}),
      Invoice.aggregate([
        { $group: { _id: null, total_amount: { $sum: '$total_amount' }, tax_amount: { $sum: '$tax_amount' }, subtotal: { $sum: '$subtotal' } } },
      ]),
    ]);
    const sums = totals[0] || { total_amount: 0, tax_amount: 0, subtotal: 0 };
    return res.json({ count, totals: sums });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Send invoice email (no attachment handling yet)
router.post('/:id/email', async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id).populate('customer_id');
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const toEmail = req.body?.toEmail || inv.customer_id?.email;
    if (!toEmail) return res.status(400).json({ error: 'Recipient email not available' });

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT || 587),
      secure: false,
      auth: process.env.MAIL_USER && process.env.MAIL_PASS ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } : undefined,
    });

    const text = `Invoice ${inv.invoice_number}\nTotal: ₹${inv.total_amount}\nStatus: ${inv.status}`;

    await transporter.sendMail({
      to: toEmail,
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      subject: `Invoice ${inv.invoice_number} from BillSync`,
      text,
    });

    return res.json({ status: 'sent', message: 'Email sent successfully' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// PDF endpoint placeholder
router.get('/:id/pdf', async (_req, res) => {
  return res.status(501).json({ error: 'PDF generation not implemented' });
});

export default router;
