// routes/purchaseOrderRoutes.js
const express = require("express");
const router = express.Router();
const PurchaseOrder = require("../models/purchaseOrder");

// Utility: calculate total
const calculateTotal = (items) => {
  if (!items || !Array.isArray(items)) return 0;

  return items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.price) || 0;
    return sum + q * p;
  }, 0);
};

// Utility: AUTO-GENERATE PO NUMBER  ->  PO/MM.YY/XXX
const generatePONumber = async () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0"); // 01–12
  const yy = String(now.getFullYear()).slice(-2);         // 25

  const prefix = `PO/${mm}.${yy}/`; // e.g. PO/03.25/

  // Find latest PO that starts with this prefix, sort descending
  const latest = await PurchaseOrder
    .findOne({ poNumber: { $regex: `^${prefix}` } })
    .sort({ poNumber: -1 });

  let nextSeq = "001";

  if (latest && latest.poNumber) {
    const parts = latest.poNumber.split("/");
    const lastPart = parts[parts.length - 1]; // "001"
    const lastNum = parseInt(lastPart, 10);
    if (!isNaN(lastNum)) {
      nextSeq = String(lastNum + 1).padStart(3, "0");
    }
  }

  return `${prefix}${nextSeq}`; // e.g. PO/03.25/002
};

// -----------------------------
// CREATE Purchase Order
// -----------------------------
router.post("/", async (req, res) => {
  try {
    const body = req.body;

    // 1) Auto-calc total
    const total = calculateTotal(body.items);

    // 2) Auto-generate PO number
    const poNumber = await generatePONumber();

    const newPO = await PurchaseOrder.create({
      ...body,
      poNumber, // 👈 ignore whatever client sends, use our generated code
      total,
    });

    res.status(201).json(newPO);
  } catch (err) {
    console.error("Create PO error:", err);
    res
      .status(500)
      .json({ message: "Failed to create PO", error: err.message });
  }
});

// -----------------------------
// GET ALL Purchase Orders
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const pos = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.json(pos);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch POs" });
  }
});

// -----------------------------
// GET Purchase Order by ID
// -----------------------------
router.get("/:id", async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: "PO not found" });

    res.json(po);
  } catch (err) {
    res.status(500).json({ message: "Error fetching PO" });
  }
});

// -----------------------------
// UPDATE Purchase Order
// -----------------------------
router.put("/:id", async (req, res) => {
  try {
    const body = req.body;

    // Auto-update total
    const total = calculateTotal(body.items);

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      {
        ...body,
        total,
        // 💡 we DON'T touch poNumber here, so the auto-generated one stays
      },
      { new: true }
    );

    if (!updatedPO) return res.status(404).json({ message: "PO not found" });

    res.json(updatedPO);
  } catch (err) {
    console.error("Update PO error:", err);
    res.status(500).json({ message: "Failed to update PO" });
  }
});

// -----------------------------
// DELETE Purchase Order
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "PO not found" });

    res.json({ message: "PO deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete PO" });
  }
});

module.exports = router;
