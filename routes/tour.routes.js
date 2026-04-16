const router = require('express').Router();
const TourController = require('../controllers/tour.controller');
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// ✅ SPECIFIC ROUTES FIRST (before dynamic :tourId)

// Get all tours for builder (incoming requests)
router.get('/builder-requests', TourController.getBuilderRequests);

// Get all tours for logged-in user (my tours)
router.get('/my-tours', TourController.getUserTours);

// ✅ DYNAMIC ROUTES AFTER (these have :tourId parameter)

// Get single tour by ID
router.get('/:tourId', TourController.getTourById);

// Accept a tour
router.put('/:tourId/accept', TourController.acceptTour);

// Reject a tour
router.put('/:tourId/reject', TourController.rejectTour);

// Cancel a tour
router.put('/:tourId/cancel', TourController.cancelTour);

// Schedule a tour (POST comes last)
router.post('/schedule', TourController.scheduleTour);

module.exports = router;