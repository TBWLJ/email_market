const express = require("express");
const cloudinary = require("../utils/cloudinary");
const Profile = require("../models/Profile");
const upload = require("../middleware/upload");
const nodemailer = require("nodemailer");

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
          resource_type: "auto",
          folder: "pdfs",
          public_id: `${Date.now()}_${req.file.originalname.replace(/\s+/g, "_")}`,
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


const emailTemplate = ({ senderEmail, downloadLink }) => `
  <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8f9fa;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">📄 New Document Shared With You</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 400;">From ${senderEmail}</p>
        </div>
        
        <div style="padding: 40px;">
            <p style="margin: 0 0 24px; color: #495057; font-size: 16px; line-height: 1.6;">Hello there,</p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #4CAF50; padding: 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
              <p style="margin: 0; color: #212529; font-weight: 500;"><strong>${senderEmail}</strong> has shared an important document with you.</p>
            </div>
            
            <p style="margin: 0 0 24px; color: #495057; font-size: 16px; line-height: 1.6;">Click the button below to view or download the PDF file:</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="${downloadLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2); transition: transform 0.2s, box-shadow 0.2s;">
                    🔍 View Document
                </a>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; margin: 32px 0; padding-top: 24px;">
                <p style="margin: 0 0 16px; color: #6c757d; font-size: 14px; line-height: 1.5;">If you weren't expecting this document or don't recognize the sender, please disregard this email.</p>
                <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.5;">For security reasons, we recommend verifying with the sender before opening attachments from unknown sources.</p>
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 8px; color: #6c757d; font-size: 14px;">Best regards,</p>
            <p style="margin: 0; color: #495057; font-weight: 600;">The Document Sharing Team</p>
            <div style="margin-top: 16px;">
                <a href="#" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="24"></a>
                <a href="#" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" width="24"></a>
                <a href="#" style="display: inline-block; margin: 0 8px;"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" alt="LinkedIn" width="24"></a>
            </div>
        </div>
    </div>
  </body>
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
