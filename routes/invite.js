// server/routes/invite.js
const express = require("express");
const crypto = require("crypto");
const axios = require("axios"); // ✅ for mailboxlayer
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// 📧 Nodemailer transporter (same style as in auth.js)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * POST /api/invite
 * Header: Authorization: Bearer <admin token>
 * Body: { email, role? }  // role defaults to "accountant"
 *
 * Returns: { message, inviteLink }
 */
router.post("/", authRequired, adminOnly, async (req, res) => {
  try {
    const { email, role } = req.body;
    const lowerEmail = (email || "").trim().toLowerCase();

    // 1) Simple format check
    const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!simpleEmailRegex.test(lowerEmail)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
    }

    // 2) Optional: mailboxlayer SMTP validation (if key exists)
    const verifyKey = process.env.EMAIL_VERIFY_KEY;
    if (verifyKey) {
      try {
        const verifyRes = await axios.get("http://apilayer.net/api/check", {
          params: {
            access_key: verifyKey,
            email: lowerEmail,
            smtp: 1,
            format: 1,
          },
        });

        const data = verifyRes.data;

        if (!data.smtp_check) {
          return res.status(400).json({
            message:
              "This email address doesn’t seem to exist. Please check the spelling or use another email.",
          });
        }
      } catch (e) {
        console.error("Email verification error:", e.message);
        // do not block if mailboxlayer fails
      }
    }

    // 3) Create or update invited user
    let user = await User.findOne({ email: lowerEmail });

    if (user && user.isActive) {
      return res
        .status(400)
        .json({ message: "User with this email is already active." });
    }

    const token = crypto.randomBytes(9).toString("base64url"); // ~12 chars
    const expiresHours = Number(process.env.INVITE_EXPIRES_HOURS || 72);
    const expires = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

    if (!user) {
      user = new User({
        email: lowerEmail,
      });
    }

    user.role = role === "admin" ? "admin" : "accountant";
    user.invitedBy = req.user._id;
    user.inviteToken = token;
    user.inviteExpires = expires;
    user.isActive = false;
    await user.save();

    // 4) Generate invite link
    const inviteLink = `${FRONTEND_URL}/accept-invite/${token}`;

    // 5) Send email to worker
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: lowerEmail,
      subject: "StartCount – You’re invited!",
      html: `
        <p>You have been invited to join <b>StartCount</b> as <b>${user.role}</b>.</p>
        <p>Click the link below to complete your account (valid for ${expiresHours} hours):</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
      `,
    });

    console.log("Invite email sent to:", lowerEmail, "link:", inviteLink);

    res.json({
      message: "Invite email sent successfully.",
      inviteLink, // optional, in case you still want to see it in frontend
    });
  } catch (err) {
    console.error("Invite error:", err);
    res.status(500).json({ message: "Server error sending invite." });
  }
});

module.exports = router;
