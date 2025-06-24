const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  emailSent: { type: Boolean, default: false },
  sentTo: { type: String, default: "" },
  sentAt: { type: Date, default: null }  
});

module.exports = mongoose.model("Profile", ProfileSchema);
