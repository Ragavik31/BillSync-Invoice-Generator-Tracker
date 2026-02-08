import 'dotenv/config';
import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { Customer } from '../src/models/Customer.js';
import { Product } from '../src/models/Product.js';
import { Invoice } from '../src/models/Invoice.js';

function getEnv(name, def = undefined) {
  const v = process.env[name];
  if (v == null || v === '') {
    if (def !== undefined) return def;
    throw new Error(`Missing env: ${name}`);
  }
  return v;
}

async function main() {
  const mongoUri = getEnv('MONGODB_URI');
  const mysqlConfig = {
    host: getEnv('MYSQL_HOST', 'localhost'),
    port: Number(getEnv('MYSQL_PORT', '3306')),
    user: getEnv('MYSQL_USER', 'root'),
    password: process.env.MYSQL_PASSWORD || '',
    database: getEnv('MYSQL_DATABASE', 'billsync_db'),
  };

  console.log('Connecting to Mongo...');
  await mongoose.connect(mongoUri);
  console.log('Connected to Mongo');

  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(mysqlConfig);
  console.log('Connected to MySQL');

  try {
    // Users
    console.log('Migrating users...');
    const [usersRows] = await conn.execute('SELECT id, email, password_hash, role, created_at, updated_at FROM users');
    for (const row of usersRows) {
      const email = (row.email || '').toLowerCase();
      const passwordHash = row.password_hash || (await bcrypt.hash('Temp123!', 10));
      await User.updateOne(
        { email },
        { $setOnInsert: { email, passwordHash, role: row.role || 'user' } },
        { upsert: true }
      );
    }

    // Customers
    console.log('Migrating customers...');
    const [custRows] = await conn.execute('SELECT id, name, email, phone, address, company, gstin, created_at, updated_at FROM customers');
    const customerIdMap = new Map(); // mysql id -> mongo _id
    for (const row of custRows) {
      const doc = await Customer.findOneAndUpdate(
        { email: (row.email || '').toLowerCase() },
        {
          $set: {
            name: row.name,
            email: (row.email || '').toLowerCase(),
            phone: row.phone,
            address: row.address,
            company: row.company,
            gstin: row.gstin,
          },
        },
        { upsert: true, new: true }
      );
      customerIdMap.set(row.id, doc._id);
    }

    // Products
    console.log('Migrating products...');
    const [prodRows] = await conn.execute('SELECT id, name, sku, description, price, purchase_price, stock_quantity, min_stock_level, category, unit, created_at, updated_at FROM products');
    const productIdMap = new Map();
    for (const row of prodRows) {
      const doc = await Product.findOneAndUpdate(
        { sku: row.sku },
        {
          $set: {
            name: row.name,
            sku: row.sku,
            description: row.description,
            price: Number(row.price || 0),
            purchase_price: Number(row.purchase_price || 0),
            stock_quantity: Number(row.stock_quantity || 0),
            min_stock_level: Number(row.min_stock_level || 10),
            category: row.category,
            unit: row.unit || 'piece',
          },
        },
        { upsert: true, new: true }
      );
      productIdMap.set(row.id, doc._id);
    }

    // Invoices and items
    console.log('Migrating invoices...');
    const [invRows] = await conn.execute('SELECT id, invoice_number, customer_id, invoice_date, due_date, subtotal, tax_amount, total_amount, status, notes, created_at, updated_at FROM invoices');
    for (const inv of invRows) {
      const [itemRows] = await conn.execute('SELECT product_id, quantity, unit_price, total_price FROM invoice_items WHERE invoice_id = ?', [inv.id]);
      const items = itemRows.map((it) => ({
        product_id: productIdMap.get(it.product_id) || undefined,
        product_name: undefined,
        quantity: Number(it.quantity || 0),
        unit_price: Number(it.unit_price || 0),
        total_price: Number(it.total_price || 0),
      }));

      await Invoice.findOneAndUpdate(
        { invoice_number: inv.invoice_number },
        {
          $set: {
            invoice_number: inv.invoice_number,
            customer_id: customerIdMap.get(inv.customer_id),
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            subtotal: Number(inv.subtotal || 0),
            tax_amount: Number(inv.tax_amount || 0),
            total_amount: Number(inv.total_amount || 0),
            status: inv.status || 'pending',
            notes: inv.notes,
            items,
          },
        },
        { upsert: true }
      );
    }

    console.log('Migration completed successfully');
  } finally {
    await conn.end();
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
