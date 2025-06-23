const express = require('express');
const nodemailer = require('nodemailer');
const pdf = require('../models/Pdf');
const router = express.Router();

router.post('/', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Fetch the latest PDF from the database
        const latestPdf = await pdf.findOne().sort({ uploadedAt: -1 });
        
        if (!latestPdf) {
            return res.status(404).json({ error: 'No PDF found' });
        }

        // Create a transporter for sending emails
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your PDF Document',
            text: 'Please find the attached PDF document.',
            html: `<p>Please find the attached PDF document, <a href="${lastestPdf.url}"</p>`,
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to send email', details: error.message });
            }
            res.status(200).json({ message: 'Email sent successfully', info });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router;