// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // bcrypt hashed password
    passwordHash: { type: String },

    // "admin" or "accountant"
    role: {
      type: String,
      enum: ["admin", "accountant"],
      default: "accountant",
    },

    // invitation flow
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inviteToken: String,
    inviteExpires: Date,

    isActive: { type: Boolean, default: false }, // true after setting password

    // 🔥 FORGOT PASSWORD fields (MUST ADD!)
    resetToken: String,
    resetTokenExpire: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
