// server/models/CompanySetting.js
const mongoose = require("mongoose");

const companySettingSchema = new mongoose.Schema(
  {
    // Simple single-company setup (no owner field needed)
    companyName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanySetting", companySettingSchema);
