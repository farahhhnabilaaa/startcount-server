const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const { authRequired } = require("../middleware/authMiddleware");

// Helper: must be admin
function requireAdmin(req, res) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Admin only" });
    return false;
  }
  return true;
}

// ==========================
// GET ALL (everyone)
// ==========================
router.get("/", authRequired, async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch quotations" });
  }
});
// ==========================
// CREATE QUOTATION (auto QTN-001, QTN-002, ...)
// ==========================
router.post("/", authRequired, async (req, res) => {
  try {
    // 1️⃣ Find latest quotation (by createdAt)
    const lastQuotation = await Quotation.findOne().sort({ createdAt: -1 });

    // 2️⃣ Decide next running number
    let nextNumber = 1;
    if (lastQuotation && lastQuotation.quotationNo) {
      // Expect formats like "QTN-001"
      const match = lastQuotation.quotationNo.match(/^QTN-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // 3️⃣ Build formatted ID, e.g. QTN-001
    const formattedId = `QTN-${String(nextNumber).padStart(3, "0")}`;

    // 4️⃣ Prepare data to save
    const data = {
      ...req.body,
      quotationNo: formattedId,   // 🔥 override anything from client
      createdBy: req.user._id,    // who created this
    };

    // accountant cannot auto-approve
    if (req.user.role !== "admin" && data.status === "Approved") {
      data.status = "Pending Approval";
    }

    const saved = await Quotation.create(data);
    res.status(201).json(saved);
  } catch (err) {
    console.error("Quotation creation error:", err);
    res
      .status(400)
      .json({ message: "Quotation validation failed", error: err.message });
  }
});


// ==========================
// GET ONE
// ==========================
router.get("/:id", authRequired, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch quotation" });
  }
});
// ==========================
// ADMIN: APPROVE (with note)
// ==========================
router.put("/:id/approve", authRequired, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { note } = req.body || {};

    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      {
        status: "Approved",
        approvalNote: note || "",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found" });

    res.json(updated);
  } catch (err) {
    console.error("Approve quotation error:", err);
    res.status(500).json({ message: "Failed to approve quotation" });
  }
});

// ==========================
// ADMIN: REJECT (with note)
// ==========================
router.put("/:id/reject", authRequired, async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { note } = req.body || {};

    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      {
        status: "Rejected",
        approvalNote: note || "",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Not found" });

    res.json(updated);
  } catch (err) {
    console.error("Reject quotation error:", err);
    res.status(500).json({ message: "Failed to reject quotation" });
  }
});

// ==========================
// UPDATE QUOTATION (basic edit)
// ==========================
router.put("/:id", authRequired, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id; // don't let client override _id

    const updated = await Quotation.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Quotation update error:", err);
    res
      .status(400)
      .json({ message: "Failed to update quotation", error: err.message });
  }
});


// ==========================
// DELETE QUOTATION (admin only)
// ==========================
router.delete("/:id", authRequired, async (req, res) => {
  if (!requireAdmin(req, res)) return; // 🔒 only admin can delete

  try {
    const deleted = await Quotation.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json({ message: "Quotation deleted" });
  } catch (err) {
    console.error("Delete quotation error:", err);
    res.status(500).json({ message: "Failed to delete quotation" });
  }
});

// ==========================
// UPDATE QUOTATION
// ==========================
router.put("/:id", authRequired, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id; // don't let client override _id

    const updated = await Quotation.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Quotation update error:", err);
    res
      .status(400)
      .json({ message: "Failed to update quotation", error: err.message });
  }
});

module.exports = router;
