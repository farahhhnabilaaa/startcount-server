// models/purchaseOrder.js

const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const PurchaseOrderSchema = new mongoose.Schema(
  {
    supplier: { type: String, required: true },
    supplierAddress: { type: String },

    poNumber: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String },

    items: [ItemSchema],

    term: { type: String },
    deliveryDate: { type: String },

    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Approved"],
      default: "Draft",
    },

    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
