const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");

// GET all invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET one invoice
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE invoice
router.post("/", async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    const saved = await invoice.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE invoice
router.put("/:id", async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE invoice (optional)
router.delete("/:id", async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
