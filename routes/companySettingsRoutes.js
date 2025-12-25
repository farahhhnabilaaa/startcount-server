// server/routes/companySettingsRoutes.js
const express = require("express");
const CompanySetting = require("../models/CompanySetting");
// const { authRequired } = require("../middleware/authMiddleware");  // ⛔ temporarily not using

const router = express.Router();

// GET company settings (single global record)
router.get("/", async (req, res) => {
  try {
    const setting = await CompanySetting.findOne();
    res.json(setting || null);
  } catch (err) {
    console.error("GET /api/company-settings error:", err);
    res.status(500).json({ message: err.message || "Server error loading settings" });
  }
});

// CREATE / UPDATE company settings (single global record)
router.post("/", async (req, res) => {
  try {
    console.log("POST /api/company-settings body:", req.body);  // 👀 see what frontend sends

    const data = {
      companyName: req.body.companyName,
      addressLine1: req.body.addressLine1,
      addressLine2: req.body.addressLine2,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
    };

    const setting = await CompanySetting.findOneAndUpdate(
      {},           // match any document
      data,         // fields to set
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log("Saved settings:", setting);
    res.json(setting);
  } catch (err) {
    console.error("POST /api/company-settings error:", err);
    res.status(500).json({ message: err.message || "Server error saving settings" });
  }
});

module.exports = router;
