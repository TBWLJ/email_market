// routes/profile.js
const express = require("express");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const Profile = require("../models/Profile");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create new profile
router.post("/create", upload.single("pdf"), async (req, res) => {
  const { senderEmail, message } = req.body;
  if (!senderEmail || !req.file) return res.status(400).json({ error: "All fields required" });

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        resource_type: "raw",
        folder: "pdf"
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(req.file.buffer);
    });

    const profile = new Profile({ senderEmail, message, pdfUrl: result.secure_url });
    await profile.save();
    res.json({ success: true, id: profile._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile by ID
router.get("/:id", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send PDF via email for a specific profile
router.post("/send/:id", async (req, res) => {
  const { email } = req.body;
  const profileId = req.params.id;

  if (!email) return res.status(400).json({ error: "User email required" });

  try {
    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: profile.senderEmail,
      to: email,
      subject: "Your PDF Document",
      html: `<p>Thank you! <a href="${profile.pdfUrl}" target="_blank">Click here to download your PDF</a></p>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
