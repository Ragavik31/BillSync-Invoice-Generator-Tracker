import express from 'express';
import crypto from 'crypto';
import { Invoice } from '../models/Invoice.js';
import axios from 'axios';

const router = express.Router();

function rzpHeaders() {
  const id = process.env.RZP_KEY_ID;
  const secret = process.env.RZP_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay keys not configured');
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/json',
  };
}

// Create Order
router.post('/create-order', async (req, res) => {
  try {
    const { invoice_id } = req.body || {};
    const inv = await Invoice.findById(invoice_id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const amount_paise = Math.round(Number(inv.total_amount) * 100);
    const body = {
      amount: amount_paise,
      currency: 'INR',
      receipt: `invoice-${inv._id}-${Date.now()}`,
      payment_capture: 1,
    };
    const resp = await axios.post('https://api.razorpay.com/v1/orders', body, { headers: rzpHeaders() });
    const data = resp.data;

    return res.json({ order: data, key_id: process.env.RZP_KEY_ID });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Create Payment Link
router.post('/create-link', async (req, res) => {
  try {
    const { invoice_id } = req.body || {};
    const inv = await Invoice.findById(invoice_id).populate('customer_id');
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const amount_paise = Math.round(Number(inv.total_amount) * 100);
    const body = {
      amount: amount_paise,
      currency: 'INR',
      accept_partial: false,
      reference_id: `invoice-${inv._id}`,
      description: `Payment for Invoice ${inv.invoice_number}`,
      customer: {
        name: inv.customer_id?.name || 'Customer',
        email: inv.customer_id?.email,
      },
      notify: { email: true },
      reminder_enable: true,
    };
    const resp = await axios.post('https://api.razorpay.com/v1/payment_links', body, { headers: rzpHeaders() });
    const data = resp.data;

    return res.json({ payment_link: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Webhook verification
router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const secret = process.env.RZP_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });
    const signature = req.header('X-Razorpay-Signature');
    if (!signature) return res.status(400).json({ error: 'Missing signature' });
    const digest = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    const valid = crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    if (!valid) return res.status(400).json({ error: 'Invalid signature' });

    const payload = JSON.parse(req.body.toString());
    // TODO: update payment status in DB if needed
    return res.json({ received: true, event: payload.event });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
