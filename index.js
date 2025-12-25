// server/index.js
// Use CommonJS everywhere
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const ocrRoutes = require("./routes/ocrRoutes");
const authRoute = require("./routes/auth");
const inviteRoute = require("./routes/invite");
const quotationRoute = require("./routes/quotationRoutes");
const invoiceRoute = require("./routes/invoiceRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const deliveryOrderRoutes = require("./routes/deliveryOrderRoutes");
const companySettingsRoutes = require("./routes/companySettingsRoutes");

// Load env
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/ocr", ocrRoutes);
app.use("/api/auth", authRoute);        // /api/auth/login, /api/auth/register-admin, /api/auth/accept-invite, /api/auth/me
app.use("/api/invite", inviteRoute);    // /api/invite (POST)


app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/quotations", quotationRoute);
app.use("/api/invoices", invoiceRoute);
app.use("/api/delivery-orders", deliveryOrderRoutes);
app.use("/api/company-settings", companySettingsRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("✅ StartCount API is running!");
});

// Simple test API
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend 👋" });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
