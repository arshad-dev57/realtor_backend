const Tour = require('../models/tour.model');
const Property = require('../models/property.model'); // If needed for property details

class TourController {
    async scheduleTour(req, res) {
        try {
            const userId = req.user.userId;
            const { propertyId, propertyTitle, date, time, name, email, phone, message } = req.body;
            
            console.log('📅 Schedule Tour Request:');
            console.log('   - User ID:', userId);
            console.log('   - Property ID:', propertyId);
            console.log('   - Property Title:', propertyTitle);
            console.log('   - Date:', date);
            console.log('   - Time:', time);
            console.log('   - Name:', name);
            console.log('   - Email:', email);
            console.log('   - Phone:', phone);
            
            // Validation
            if (!propertyId || !propertyTitle || !date || !time || !name || !email || !phone) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }
            
            // Create tour request
            const tour = new Tour({
                propertyId,
                propertyTitle,
                userId,
                name,
                email,
                phone,
                date,
                time,
                message: message || '',
                status: 'pending'
            });
            
            await tour.save();
            
            console.log('✅ Tour scheduled successfully:', tour._id);
            
            res.status(201).json({
                success: true,
                message: 'Tour scheduled successfully! The realtor will contact you soon.',
                data: tour
            });
        } catch (error) {
            console.error('❌ Schedule Tour Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Get user's own tours (customer view)
    async getUserTours(req, res) {
        try {
            const userId = req.user.userId;
            const tours = await Tour.find({ userId }).sort({ createdAt: -1 });
            
            console.log(`📋 Found ${tours.length} tours for user: ${userId}`);
            
            res.status(200).json({
                success: true,
                count: tours.length,
                data: tours
            });
        } catch (error) {
            console.error('❌ Get User Tours Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Get builder's incoming tour requests
    async getBuilderRequests(req, res) {
        try {
            const builderId = req.user.userId;
            
            // Find all properties owned by this builder first (if you have property ownership)
            // Or simply get all pending requests for properties
            // For now, get all tours that are not cancelled/completed
            
            const tours = await Tour.find({ 
                status: { $in: ['pending', 'confirmed', 'completed'] }
            }).sort({ createdAt: -1 });
            
            console.log(`📋 Builder ${builderId} has ${tours.length} incoming tour requests`);
            
            // If you have property ownership, filter by builder's properties:
            // const builderProperties = await Property.find({ builderId });
            // const propertyIds = builderProperties.map(p => p._id);
            // const tours = await Tour.find({ propertyId: { $in: propertyIds } }).sort({ createdAt: -1 });
            
            res.status(200).json({
                success: true,
                count: tours.length,
                data: tours
            });
        } catch (error) {
            console.error('❌ Get Builder Requests Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Get single tour by ID
    async getTourById(req, res) {
        try {
            const { tourId } = req.params;
            const userId = req.user.userId;
            
            const tour = await Tour.findOne({ _id: tourId });
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: tour
            });
        } catch (error) {
            console.error('❌ Get Tour By ID Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Accept tour request
    async acceptTour(req, res) {
        try {
            const { tourId } = req.params;
            
            const tour = await Tour.findByIdAndUpdate(
                tourId,
                { status: 'confirmed' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found'
                });
            }
            
            console.log(`✅ Tour accepted: ${tourId}`);
            
            res.status(200).json({
                success: true,
                message: 'Tour request accepted',
                data: tour
            });
        } catch (error) {
            console.error('❌ Accept Tour Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Reject tour request
    async rejectTour(req, res) {
        try {
            const { tourId } = req.params;
            
            const tour = await Tour.findByIdAndUpdate(
                tourId,
                { status: 'rejected' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found'
                });
            }
            
            console.log(`❌ Tour rejected: ${tourId}`);
            
            res.status(200).json({
                success: true,
                message: 'Tour request rejected',
                data: tour
            });
        } catch (error) {
            console.error('❌ Reject Tour Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Cancel tour (by customer or builder)
    async cancelTour(req, res) {
        try {
            const { tourId } = req.params;
            
            const tour = await Tour.findByIdAndUpdate(
                tourId,
                { status: 'cancelled' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found'
                });
            }
            
            console.log(`🚫 Tour cancelled: ${tourId}`);
            
            res.status(200).json({
                success: true,
                message: 'Tour cancelled successfully',
                data: tour
            });
        } catch (error) {
            console.error('❌ Cancel Tour Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ Reschedule tour (update date/time)
    async rescheduleTour(req, res) {
        try {
            const { tourId } = req.params;
            const { date, time } = req.body;
            
            const tour = await Tour.findByIdAndUpdate(
                tourId,
                { date, time, status: 'pending' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found'
                });
            }
            
            console.log(`📅 Tour rescheduled: ${tourId}`);
            
            res.status(200).json({
                success: true,
                message: 'Tour rescheduled successfully',
                data: tour
            });
        } catch (error) {
            console.error('❌ Reschedule Tour Error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new TourController();