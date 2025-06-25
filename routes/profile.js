const express = require("express");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const Profile = require("../models/Profile");
const upload = require("../middleware/upload");
const nodemailer = require("nodemailer");
const axios = require("axios");

const router = express.Router();

// Create new profile
router.post("/create", upload.single("pdf"), async (req, res) => {
  const { senderEmail, message = "" } = req.body;

  if (!senderEmail || !req.file) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "pdfs",
          public_id: `${Date.now()}_${req.file.originalname}`,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(req.file.buffer);
    });

    const profile = new Profile({
      senderEmail,
      message,
      pdfUrl: result.secure_url, // Full URL to download
      publicId: result.public_id,
    });

    await profile.save();

    res.status(201).json({ success: true, profile });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get profile by ID
router.get("/:id", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Email Template
const emailTemplate = ({ senderEmail, downloadLink }) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
    <h2 style="color: #2e7d32;">You've received a PDF from ${senderEmail}</h2>
    <p>Hello,</p>
    <p><strong>${senderEmail}</strong> has sent you a document.</p>
    <p>You can view or download it by clicking the button below:</p>
    <div style="margin: 20px 0;">
      <a href="${downloadLink}" target="_blank" style="background-color: #2e7d32; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Open PDF
      </a>
    </div>
    <p>If you didn’t request this document, you can ignore this email.</p>
    <p>Thanks,<br/>The Team</p>
  </div>
`;


// Send PDF via Email (link only, no attachment)
router.post("/send/:id", async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  if (!email) return res.status(400).json({ error: "User email is required" });

  try {
    const profile = await Profile.findById(id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    if (!profile.senderEmail || !profile.publicId) {
      return res.status(400).json({ error: "Missing senderEmail or publicId" });
    }

    // ✅ Construct Cloudinary raw download link (opens PDF directly)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const pdfUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${profile.publicId}`;

    // ✅ Nodemailer setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"${profile.senderEmail}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Here is your PDF",
      html: emailTemplate({
        senderEmail: profile.senderEmail,
        downloadLink: pdfUrl, // link opens PDF
      }),
    };

    await transporter.sendMail(mailOptions);

    // ✅ Save send history
    profile.sentHistory = profile.sentHistory || [];
    profile.sentHistory.push({
      email,
      sentAt: new Date(),
    });
    await profile.save();

    res.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Check email send history
router.get("/status/:id", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    res.json({ sentHistory: profile.sentHistory || [] });
  } catch (err) {
    res.status(500).json({ error: "Error fetching status" });
  }
});

module.exports = router;
