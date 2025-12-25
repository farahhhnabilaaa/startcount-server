// server/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🔑 Use same secret as in auth.js
const JWT_SECRET = process.env.JWT_SECRET || "startcountt_dev_fallback_secret";

// Check that user is logged in (has valid token)
exports.authRequired = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    // Expect: "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // attach to request for later middlewares
    next();
  } catch (err) {
    console.error("authRequired error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ Extra middleware: only allow admins
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
