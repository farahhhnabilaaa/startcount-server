// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// 🔑 Use .env if available, otherwise use a dev fallback
const JWT_SECRET = process.env.JWT_SECRET || "startcountt_dev_fallback_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// 🔐 Strong password rule:
// - min 8 chars
// - at least 1 lowercase
// - at least 1 uppercase
// - at least 1 number
// - at least 1 special char (@$!%*?&)
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const makeToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });

// 📧 Nodemailer transporter (Gmail example)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // app password
  },
});

/**
 * 1) TEMP: create first admin manually
 * POST /api/auth/register-admin
 * Body: { name, email, password }
 */
router.post("/register-admin", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const lowerEmail = email.toLowerCase();

    // 🔐 Enforce strong password for admin too
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const existing = await User.findOne({ email: lowerEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: lowerEmail,
      passwordHash,
      role: "admin",
      isActive: true,
    });

    const token = makeToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("register-admin error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/**
 * 2) Login
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account not activated" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = makeToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/**
 * 2.5) Forgot password - send reset email
 * POST /api/auth/forgot-password
 * Body: { email }
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // For security, we do not reveal whether the email exists
    if (!user) {
      return res
        .status(200)
        .json({ message: "If this email exists, a reset link has been sent." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "StartCount – Password Reset",
      html: `
        <p>You requested to reset your StartCount password.</p>
        <p>Click the link below (valid for 15 minutes):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
      `,
    });

    return res
      .status(200)
      .json({ message: "Reset link sent if email exists." });
  } catch (err) {
    console.error("forgot-password error:", err);
    return res
      .status(500)
      .json({ message: "Error sending reset email.", error: err.message });
  }
});

/**
 * 2.6) Reset password
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required." });
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    user.passwordHash = passwordHash;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("reset-password error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/**
 * 3) Accept invite (✅ TOKEN ONLY)
 * POST /api/auth/accept-invite
 * Body: { token, name, password }
 */
router.post("/accept-invite", async (req, res) => {
  try {
    const { token, name, password } = req.body;

    // 🔐 Enforce strong password when worker sets password
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    // ✅ Look up only by inviteToken (no email in body, no email in URL)
    const user = await User.findOne({ inviteToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid invite link" });
    }

    if (user.inviteExpires && user.inviteExpires < new Date()) {
      return res.status(400).json({ message: "Invite has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    user.name = name;
    user.passwordHash = passwordHash;
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteExpires = undefined;
    await user.save();

    const jwtToken = makeToken(user);

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("accept-invite error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

/**
 * 4) Get current user
 * GET /api/auth/me
 */
router.get("/me", authRequired, async (req, res) => {
  const u = req.user;
  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
  });
});

module.exports = router;
