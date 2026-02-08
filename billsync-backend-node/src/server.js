import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';
import paymentRoutes from './routes/payments.js';
import profitRoutes from './routes/profits.js';

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Use raw parser for Razorpay webhook before json parser to preserve raw body
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/profits', profitRoutes);

const port = process.env.PORT || 5000;

connectDB(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
