import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    address: String,
    company: String,
    gstin: String,
  },
  { timestamps: true }
);

export const Customer = mongoose.model('Customer', customerSchema);
