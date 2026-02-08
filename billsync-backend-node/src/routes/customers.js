import express from 'express';
import { Customer } from '../models/Customer.js';
import { CustomerReply } from '../models/CustomerReply.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    return res.json(customers.map(c => ({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      company: c.company,
      gstin: c.gstin,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    })));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const customer = await Customer.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      company: data.company,
      gstin: data.gstin,
    });
    return res.status(201).json({
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      company: customer.company,
      gstin: customer.gstin,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
      login_created: false,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const c = await Customer.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      company: c.company,
      gstin: c.gstin,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = req.body || {};
    const c = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          company: data.company,
          gstin: data.gstin,
        },
      },
      { new: true }
    );
    if (!c) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      company: c.company,
      gstin: c.gstin,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const c = await Customer.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Customer deleted successfully' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Customer replies
router.get('/:id/replies', async (req, res) => {
  try {
    const replies = await CustomerReply.find({ customer_id: req.params.id }).sort({ createdAt: -1 });
    return res.json(
      replies.map((r) => ({
        id: r._id,
        customer_id: r.customer_id,
        message: r.message,
        author: r.author,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
    );
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/:id/replies', async (req, res) => {
  try {
    const data = req.body || {};
    const reply = await CustomerReply.create({
      customer_id: req.params.id,
      message: data.message,
      author: data.author || 'admin',
      ...data,
    });
    return res.status(201).json({
      id: reply._id,
      customer_id: reply.customer_id,
      message: reply.message,
      author: reply.author,
      created_at: reply.createdAt,
      updated_at: reply.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
