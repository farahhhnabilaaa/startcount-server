// server/routes/ocrRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
require("dotenv").config();

// Store uploaded file in memory
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Simple heuristic parser for quotation/invoice text.
 * Extracts: quotationNo, date, customer, billingAddress, shippingAddress, items
 */
function parseQuotation(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length);

  const result = {
    quotationNo: "",
    date: "",
    customer: "",
    billingAddress: "",
    shippingAddress: "",
    items: [], // 🔹 new
  };

  const isHeaderStop = (line) =>
    /^(Place of Supply|GSTIN|PAN|Item #|Item #\/Item description|Country of Supply|Qty\.?|Rate|Amount|Sub Total|Total|Discount)/i.test(
      line
    );

  // Quotation No, e.g. "Quotation# 004" or "Quotation No: QT-002"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let m = line.match(/Quotation\s*(No\.?|#)\s*[:\-]?\s*(.+)/i);
    if (m) {
      result.quotationNo = m[2].trim();
      break;
    }

    if (/^Quotation\s*(No\.?|#)\s*:?$/i.test(line) && lines[i + 1]) {
      result.quotationNo = lines[i + 1].trim();
      break;
    }
  }

  // Date, e.g. "Quotation Date JUN 19, 2019" or "Date: 2025-11-19"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(/(Quotation\s*Date|Date)\s*[:\-]?\s*(.+)/i);
    if (m) {
      result.date = m[2].trim();
      break;
    }
  }

  // "Quotation by" → billingAddress
  let idxBy = lines.findIndex((l) => /Quotation\s*by/i.test(l));
  if (idxBy !== -1) {
    const nameLine = lines[idxBy + 1] || "";
    const addrLines = [];
    for (let i = idxBy + 2; i < lines.length; i++) {
      if (isHeaderStop(lines[i])) break;
      addrLines.push(lines[i]);
    }
    // join with commas; frontend can display with newlines if needed
    result.billingAddress = [nameLine, ...addrLines].join(", ");
  }

  // "Quotation to" → customer + shippingAddress
  let idxTo = lines.findIndex((l) => /Quotation\s*to/i.test(l));
  if (idxTo !== -1) {
    const nameLine = lines[idxTo + 1] || "";
    const addrLines = [];
    for (let i = idxTo + 2; i < lines.length; i++) {
      if (isHeaderStop(lines[i])) break;
      addrLines.push(lines[i]);
    }
    result.customer = nameLine;
    result.shippingAddress = [nameLine, ...addrLines].join(", ");
  }

  // 🔹 Item parsing (very heuristic, tuned for Foobar-style layout)
  // Look for lines after "Item #/Item description" or "Item #" etc.
  let itemsStartIdx = lines.findIndex((l) =>
    /Item\s*#\/?Item description/i.test(l)
  );
  if (itemsStartIdx === -1) {
    itemsStartIdx = lines.findIndex((l) => /^Item\s*#/i.test(l));
  }

  const items = [];

  if (itemsStartIdx !== -1) {
    for (let i = itemsStartIdx + 1; i < lines.length; i++) {
      const line = lines[i];

      // stop when reaching totals / discount / terms
      if (
        /^(Sub\s*Total|Discount|Total|Terms and Conditions|Additional Notes)/i.test(
          line
        )
      ) {
        break;
      }

      // Typical OCR row:
      // "1. Basic Web Development 1 10,000 10,000.00"
      // Use a regex to pull out description, qty, rate, amount
      const rowMatch = line.match(
        /^\s*\d+\.\s+(.*)\s+(\d+)\s+([0-9,]+(?:\.\d{2})?)\s+([0-9,]+(?:\.\d{2})?)\s*$/
      );

      if (rowMatch) {
        const [, desc, qtyStr, rateStr, amountStr] = rowMatch;
        const qty = parseInt(qtyStr, 10) || 0;
        const rate = parseFloat(rateStr.replace(/,/g, "")) || 0;
        const amount = parseFloat(amountStr.replace(/,/g, "")) || 0;

        items.push({
          description: desc.trim(),
          quantity: qty,
          rate,
          amount,
        });
      }
    }
  }

  result.items = items;

  return result;
}

/**
 * Build a nice human-readable summary sentence from extracted fields.
 * Examples:
 * - "Quotation from Foobar Labs to Studio Den on JUN 19, 2019"
 * - "Quotation from Foobar Labs on JUN 19, 2019"
 */
function buildSummary(extracted) {
  const supplierName = extracted.billingAddress
    ? extracted.billingAddress.split(",")[0].trim()
    : "";

  const customerName = extracted.customer
    ? extracted.customer.trim()
    : extracted.shippingAddress
    ? extracted.shippingAddress.split(",")[0].trim()
    : "";

  const dateText = extracted.date || "";

  let base = "Quotation";

  if (supplierName) {
    base += ` from ${supplierName}`;
  }

  if (customerName) {
    base += supplierName ? ` to ${customerName}` : ` for ${customerName}`;
  }

  if (dateText) {
    base += ` on ${dateText}`;
  }

  if (!supplierName && !customerName && !dateText) {
    base = "Imported quotation (OCR)";
  }

  return base;
}

// POST /api/ocr
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.OCR_API_KEY) {
      console.error("❌ Missing OCR_API_KEY in .env");
      return res
        .status(500)
        .json({ message: "Server OCR_API_KEY is not configured" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const base64Image = req.file.buffer.toString("base64");
    const base64String = `data:${req.file.mimetype};base64,${base64Image}`;

    const params = new URLSearchParams();
    params.append("base64Image", base64String);
    params.append("language", "eng");
    params.append("isOverlayRequired", "false");

    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      params,
      {
        headers: {
          apikey: process.env.OCR_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        maxBodyLength: Infinity,
      }
    );

    if (response.data.IsErroredOnProcessing) {
      console.error("❌ OCR.space error:", response.data.ErrorMessage);
      return res.status(500).json({
        message: "OCR service error",
        serviceError: response.data.ErrorMessage,
      });
    }

    const parsedText =
      response.data.ParsedResults &&
      response.data.ParsedResults[0] &&
      response.data.ParsedResults[0].ParsedText;

    const cleanText = parsedText || "";
    const extracted = parseQuotation(cleanText);
    const summary = buildSummary(extracted);

    return res.json({
      text: cleanText,
      extracted,
      summary,
    });
  } catch (err) {
    console.error("❌ OCR ERROR:", err.response?.data || err.message || err);
    return res.status(500).json({
      message: "OCR error",
      error: err.message,
      serviceResponse: err.response?.data,
    });
  }
});

module.exports = router;
