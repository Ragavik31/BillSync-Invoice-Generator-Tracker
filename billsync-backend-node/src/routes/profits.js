import express from 'express';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';

const router = express.Router();

router.get('/summary', async (_req, res) => {
  try {
    // Compute profit per invoice by joining items with product purchase_price
    const invoiceProfits = await Invoice.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product_id',
          foreignField: '_id',
          as: 'prod',
        },
      },
      { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          line_profit: {
            $multiply: [
              {
                $subtract: [
                  '$items.unit_price',
                  { $ifNull: ['$prod.purchase_price', 0] },
                ],
              },
              '$items.quantity',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$_id',
          customer_id: { $first: '$customer_id' },
          invoice_number: { $first: '$invoice_number' },
          profit: { $sum: '$line_profit' },
          total_amount: { $first: '$total_amount' },
        },
      },
    ]);

    const overall_profit = invoiceProfits.reduce(
      (sum, r) => sum + (Number(r.profit) || 0),
      0
    );

    // Group per customer in JS to keep pipeline simpler
    const perClientMap = new Map();
    for (const inv of invoiceProfits) {
      const key = inv.customer_id ? String(inv.customer_id) : 'unknown';
      if (!perClientMap.has(key)) {
        perClientMap.set(key, {
          customer_id: inv.customer_id,
          profit: 0,
          invoice_count: 0,
          revenue: 0,
        });
      }
      const entry = perClientMap.get(key);
      entry.profit += Number(inv.profit) || 0;
      entry.invoice_count += 1;
      entry.revenue += Number(inv.total_amount) || 0;
    }

    const customerIds = [...perClientMap.values()]
      .map((e) => e.customer_id)
      .filter((id) => !!id);

    const customers = await Customer.find({ _id: { $in: customerIds } }).select(
      'name'
    );
    const customerNameMap = new Map(
      customers.map((c) => [String(c._id), c.name])
    );

    const per_client = [...perClientMap.values()].map((e) => {
      const revenue = e.revenue || 0;
      const profit = e.profit || 0;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return {
        customer_id: e.customer_id,
        customer_name: e.customer_id
          ? customerNameMap.get(String(e.customer_id)) || 'Unknown'
          : 'Unknown',
        profit,
        invoice_count: e.invoice_count,
        revenue,
        profit_margin_pct: margin,
      };
    });

    return res.json({ overall_profit, per_client });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
