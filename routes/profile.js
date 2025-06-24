// routes/profile.js
const express = require("express");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const Profile = require("../models/Profile");
const upload = require("../middleware/upload");
const nodemailer = require("nodemailer");

const router = express.Router();
const storage = multer.memoryStorage();

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
          folder: "pdfs", // Folder in your Cloudinary
          public_id: `${Date.now()}_${req.file.originalname}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    const profile = new Profile({
      senderEmail,
      message,
      pdfUrl: result.secure_url,
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
    res.json({ profile }); // wrap in an object
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Email HTML template function
const emailTemplate = ({ senderEmail, downloadLink }) => `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px;">
    <h2 style="color: #2e7d32;">You've received a PDF from ${senderEmail}</h2>
    <p>Hello,</p>
    <p>You recently requested a document from <strong>${senderEmail}</strong>.</p>
    <p>You can download the attached PDF by clicking the button below:</p>

    <div style="margin: 30px 0;">
      <a href="${downloadLink}" 
         style="display: inline-block; background-color: #2e7d32; color: white; padding: 12px 20px; 
                text-decoration: none; border-radius: 5px; font-weight: bold;">
        Download PDF
      </a>
    </div>

    <p>If you didn’t request this document, you can ignore this email.</p>
    <p style="margin-top: 40px;">Thanks,<br/>The Team</p>
  </div>
`;

// Send PDF via email route
router.post("/send/:id", async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  if (!email) return res.status(400).json({ error: "User email is required" });

  try {
    const profile = await Profile.findById(id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Setup transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: `"${profile.senderEmail}" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Here is your PDF",
      html: emailTemplate({
        senderEmail: profile.senderEmail,
        downloadLink: profile.pdfUrl,
      }),
      attachments: [
        {
          filename: "document.pdf",
          path: profile.pdfUrl,
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Track sent email
    if (!Array.isArray(profile.sentHistory)) {
      profile.sentHistory = [];
    }
    profile.sentHistory.push({ email, sentAt: new Date() });
    await profile.save();

    return res.json({ success: true, message: "Email sent and tracking saved" });
  } catch (err) {
    console.error("Failed to send email:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
});



router.get("/status/:id", async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    res.json({
      emailSent: profile.emailSent,
      sentTo: profile.sentTo,
      sentAt: profile.sentAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching status" });
  }
});


module.exports = router;
