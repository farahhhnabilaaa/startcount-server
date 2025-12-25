const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
  invoiceNo: String,
  date: String,
  customer: String,
  billingAddress: String,
  shippingAddress: String,
  description: String,
  items: [
    {
      item: String,
      quantity: Number,
      price: Number,
    }
  ],
  total: Number,
  term: String,
  dueDate: String,
  status: String,
  quickShare: Boolean,
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
