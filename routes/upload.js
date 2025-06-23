const express = require('express');
const multer = require('multer');
const cloudinary = require('../utils/cloudinary');
const Pdf = require('../models/Pdf');


const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('pdf'), async (req, res) => {
    async (req, res) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const result = cloudinary.uploader.upload_stream(
                { resource_type: 'raw', folder: 'pdfs' },
                (error, result) => {
                    if (error) {
                        return res.status(500).json({ error: 'Upload failed', details: error });
                    }
                    return result;
                }
            ).end(file.buffer);

            const newPdf = new Pdf({
                url: result.secure_url,
            });

            await newPdf.save();
            res.status(201).json(newPdf);
        } catch (error) {
            res.status(500).json({ error: 'Server error', details: error.message });
        }
    }
});

module.exports = router;