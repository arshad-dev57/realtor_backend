// backend/config/cloudinary.config.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Simple storage - sab images ek hi folder mein
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'estate_app/properties',  // Sirf ek folder
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 800, crop: 'limit' }],
    },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };