// backend/routes/property.routes.js
const router = require('express').Router();
const PropertyController = require('../controllers/property.controller');
const { protect } = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary.config');

// Protected routes with image upload
router.post(
    '/add', 
    protect, 
    upload.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'bedroomImages', maxCount: 10 },
        { name: 'bathroomImages', maxCount: 10 },
        { name: 'kitchenImages', maxCount: 10 },
        { name: 'livingImages', maxCount: 10 },
        { name: 'exteriorImages', maxCount: 10 },
    ]),
    PropertyController.addProperty
);

router.put(
    '/my-properties/:propertyId',
    protect,
    upload.fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'bedroomImages', maxCount: 10 },
        { name: 'bathroomImages', maxCount: 10 },
        { name: 'kitchenImages', maxCount: 10 },
        { name: 'livingImages', maxCount: 10 },
        { name: 'exteriorImages', maxCount: 10 },
    ]),
    PropertyController.updateProperty
);
router.get('/city/:city', PropertyController.getPropertiesByCity);
router.delete('/my-properties/:propertyId', protect, PropertyController.deleteProperty);
router.get('/my-properties', protect, PropertyController.getMyProperties);
router.get('/search', PropertyController.searchProperties);
router.get('/my-properties/:propertyId', protect, PropertyController.getPropertyById);
router.get('/all', PropertyController.getAllProperties);
router.get('/public/:propertyId', PropertyController.getPropertyById);

module.exports = router;