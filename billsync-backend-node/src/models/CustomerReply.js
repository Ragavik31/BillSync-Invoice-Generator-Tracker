import mongoose from 'mongoose';

const customerReplySchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    message: { type: String },
    author: { type: String }, // e.g. 'customer' or 'admin'
  },
  {
    timestamps: true,
    strict: false, // allow arbitrary extra fields from the frontend
  }
);

export const CustomerReply = mongoose.model('CustomerReply', customerReplySchema);
