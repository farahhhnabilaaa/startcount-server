// server/models/Quotation.js
const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    customer: { type: String, default: "", trim: true },
    paymentMode: { type: String, default: "" },
    billingAddress: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    description: { type: String, default: "" },
    rawText: { type: String, default: "" },
    items: { type: [itemSchema], default: [] },
    total: { type: Number, default: 0 },

    // you can later restrict with enum if you like
    status: { type: String, default: "Draft" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },

    // 🔹 NEW: admin note shown to accountant
    approvalNote: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
