// backend/routes/tour.routes.js
const router = require('express').Router();
const TourController = require('../controllers/tour.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/schedule', protect, TourController.scheduleTour);
router.get('/my-tours', protect, TourController.getUserTours);
router.put('/:tourId/status', protect, TourController.updateTourStatus);

module.exports = router;