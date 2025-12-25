const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema({
  quotationNo: { type: String, required: true },
  date: { type: String, required: true },
  customer: { type: String, required: true },
  description: { type: String },
  total: { type: Number, default: 0 },
  status: { type: String, default: "Draft" },
}, { timestamps: true });

module.exports = mongoose.model("Quotation", quotationSchema);
