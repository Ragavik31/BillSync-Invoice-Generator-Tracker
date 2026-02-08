import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    description: String,
    price: { type: Number, required: true },
    purchase_price: { type: Number, default: 0 },
    stock_quantity: { type: Number, default: 0 },
    min_stock_level: { type: Number, default: 10 },
    category: String,
    unit: { type: String, default: 'piece' },
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
