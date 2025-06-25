const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  senderEmail: String,
  message: String,
  pdfUrl: String,
  publicId: String,
  sentHistory: [
    {
      email: String,
      sentAt: Date
    }
  ]
});

module.exports = mongoose.model("Profile", profileSchema);
