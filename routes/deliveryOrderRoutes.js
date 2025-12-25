// server/routes/deliveryOrderRoutes.js
const express = require("express");
const router = express.Router();
const DeliveryOrder = require("../models/deliveryOrder");

// CREATE DO
router.post("/", async (req, res) => {
  try {
    // req.body now includes customerAddress as well
    const newDO = new DeliveryOrder(req.body);
    const saved = await newDO.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const list = await DeliveryOrder.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET BY ID
router.get("/:id", async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Delivery Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE DO
router.put("/:id", async (req, res) => {
  try {
    // req.body includes customerAddress when editing
    const updated = await DeliveryOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await DeliveryOrder.findByIdAndDelete(req.params.id);
    res.json({ message: "Delivery Order deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
