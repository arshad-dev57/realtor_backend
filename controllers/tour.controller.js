// backend/controllers/tour.controller.js
const Tour = require('../models/tour.model');

class TourController {
    async scheduleTour(req, res) {
        try {
            const userId = req.user.userId;
            const { propertyId, propertyTitle, date, time, name, email, phone } = req.body;
            
            if (!propertyId || !date || !time || !name || !email || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }
            
            const tour = new Tour({
                propertyId,
                propertyTitle,
                userId,
                name,
                email,
                phone,
                date,
                time,
                status: 'pending'
            });
            
            await tour.save();
            
            // Send email notification to realtor (optional)
            
            res.status(201).json({
                success: true,
                message: 'Tour scheduled successfully',
                data: tour
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async getUserTours(req, res) {
        try {
            const userId = req.user.userId;
            const tours = await Tour.find({ userId }).sort({ createdAt: -1 });
            
            res.status(200).json({
                success: true,
                data: tours
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    async updateTourStatus(req, res) {
        try {
            const { tourId } = req.params;
            const { status } = req.body;
            
            const tour = await Tour.findByIdAndUpdate(
                tourId,
                { status },
                { new: true }
            );
            
            res.status(200).json({
                success: true,
                message: 'Tour status updated',
                data: tour
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new TourController();