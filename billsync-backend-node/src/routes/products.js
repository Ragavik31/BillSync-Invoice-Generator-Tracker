import express from 'express';
import { Product } from '../models/Product.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page || '1', 10);
    let per_page = parseInt(req.query.per_page || '10', 10);
    if (page < 1) page = 1;
    if (per_page < 1 || per_page > 100) per_page = 10;

    const skip = (page - 1) * per_page;
    const [items, total] = await Promise.all([
      Product.find({}).skip(skip).limit(per_page).sort({ createdAt: -1 }),
      Product.countDocuments({}),
    ]);

    const pages = Math.ceil(total / per_page) || 1;
    return res.json({
      products: items.map(p => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        purchase_price: p.purchase_price || 0,
        stock_quantity: p.stock_quantity,
        min_stock_level: p.min_stock_level,
        category: p.category,
        unit: p.unit,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      pagination: {
        page,
        per_page,
        total,
        pages,
        has_prev: page > 1,
        has_next: page < pages,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const d = req.body || {};
    if (!d.name || !d.sku || d.price == null) {
      return res.status(400).json({ error: 'Missing required fields: name, sku, price' });
    }
    const existing = await Product.findOne({ sku: d.sku });
    if (existing) return res.status(400).json({ error: 'SKU already exists. Please use a different SKU.' });
    const p = await Product.create({
      name: d.name,
      sku: d.sku,
      description: d.description,
      price: Number(d.price),
      purchase_price: d.purchase_price != null && d.purchase_price !== '' ? Number(d.purchase_price) : 0,
      stock_quantity: Number.isFinite(+d.stock_quantity) ? +d.stock_quantity : 0,
      min_stock_level: Number.isFinite(+d.min_stock_level) ? +d.min_stock_level : 10,
      category: d.category,
      unit: d.unit || 'piece',
    });
    return res.status(201).json({
      id: p._id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: p.price,
      purchase_price: p.purchase_price || 0,
      stock_quantity: p.stock_quantity,
      min_stock_level: p.min_stock_level,
      category: p.category,
      unit: p.unit,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const d = req.body || {};
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });

    if (d.name != null) p.name = d.name;
    if (d.sku != null) p.sku = d.sku;
    if (d.description != null) p.description = d.description;
    if (d.price != null) p.price = Number(d.price);
    if (d.purchase_price != null && d.purchase_price !== '') p.purchase_price = Number(d.purchase_price);
    if (d.stock_quantity != null) p.stock_quantity = Number(d.stock_quantity);
    if (d.min_stock_level != null) p.min_stock_level = Number(d.min_stock_level);
    if (d.category != null) p.category = d.category;
    if (d.unit != null) p.unit = d.unit;

    await p.save();
    return res.json({
      id: p._id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: p.price,
      purchase_price: p.purchase_price || 0,
      stock_quantity: p.stock_quantity,
      min_stock_level: p.min_stock_level,
      category: p.category,
      unit: p.unit,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Product deleted successfully' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
