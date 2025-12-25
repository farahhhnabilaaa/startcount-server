// server/models/deliveryOrder.js
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
});

const DeliveryOrderSchema = new mongoose.Schema(
  {
    doNo: { type: String, required: true },
    date: { type: String, required: true },
    customer: { type: String, required: true },

    // 🔹 NEW FIELD: this will store the buyer address you type in the form
    customerAddress: { type: String },

    // optional description (you can use later if needed)
    description: { type: String },

    // PO or Invoice ref
    reference: { type: String },
    remarks: { type: String },

    items: [ItemSchema],

    status: {
      type: String,
      enum: ["Pending", "Out for Delivery", "Delivered"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryOrder", DeliveryOrderSchema);
