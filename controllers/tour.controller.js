const Tour = require('../models/tour.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { sendToUser } = require("../services/onesignal");
const { sendEmail } = require('../services/email.service');

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
            
            // Get user who is scheduling the tour (buyer)
            const buyer = await User.findById(userId);
            
            // Get property to find who added it (realtor or admin)
            const property = await Property.findById(propertyId);
            
            if (!property) {
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }
            
            // Find property owner (who added this property)
            let propertyOwner = null;
            
            // If property has realtorId field
            if (property.realtorId) {
                propertyOwner = await User.findById(property.realtorId);
            } 
            // If property has addedBy field
            else if (property.addedBy) {
                propertyOwner = await User.findById(property.addedBy);
            }
            // If property has userId field
            else if (property.userId) {
                propertyOwner = await User.findById(property.userId);
            }
            
            // If no owner found, send to admin
            if (!propertyOwner) {
                propertyOwner = await User.findOne({ role: 'admin' });
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
                status: 'pending',
                ownerId: propertyOwner ? propertyOwner._id : null
            });
            
            await tour.save();
            
            console.log('✅ Tour scheduled successfully:', tour._id);
            
            // ========== SEND NOTIFICATIONS ==========
            try {
                // Send notification to property owner (realtor or admin)
                if (propertyOwner) {
                    // OneSignal notification
                    await sendToUser({
                        mongoUserId: propertyOwner._id.toString(),
                        title: "📅 New Tour Request",
                        message: `${buyer ? buyer.name : name} requested a tour for "${propertyTitle}" on ${date} at ${time}`,
                        data: {
                            type: "tour_request",
                            screen: "tours",
                            tourId: tour._id.toString(),
                            propertyId: propertyId,
                            propertyTitle: propertyTitle,
                            userName: buyer ? buyer.name : name,
                            userEmail: buyer ? buyer.email : email,
                            userPhone: buyer ? buyer.phone : phone,
                            date: date,
                            time: time,
                            message: message || ''
                        }
                    });
                    console.log(`✅ Tour request notification sent to property owner: ${propertyOwner.email} (${propertyOwner.role})`);
                    
                    // Save notification to database
                    const notification = new Notification({
                        userId: propertyOwner._id,
                        title: "📅 New Tour Request",
                        message: `${buyer ? buyer.name : name} requested a tour for "${propertyTitle}"`,
                        type: "tour_request",
                        data: {
                            tourId: tour._id.toString(),
                            propertyId: propertyId,
                            propertyTitle: propertyTitle,
                            date: date,
                            time: time
                        }
                    });
                    await notification.save();
                    console.log(`✅ Notification saved to DB for ${propertyOwner.email}`);
                    
                    // Send email to property owner
                    const emailBody = `
                        <h2>📅 New Tour Request</h2>
                        <p><strong>Property:</strong> ${propertyTitle}</p>
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>Time:</strong> ${time}</p>
                        <p><strong>Customer Name:</strong> ${buyer ? buyer.name : name}</p>
                        <p><strong>Customer Email:</strong> ${buyer ? buyer.email : email}</p>
                        <p><strong>Customer Phone:</strong> ${buyer ? buyer.phone : phone}</p>
                        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
                        <br>
                        <p>Please login to the dashboard to accept or reject this tour request.</p>
                    `;
                    
                    await sendEmail({
                        to: propertyOwner.email,
                        subject: "📅 New Tour Request - Action Required",
                        body: emailBody,
                        fromEmail: process.env.EMAIL_USER,
                        fromName: "Elite CRM System"
                    });
                    console.log(`✅ Tour request email sent to property owner: ${propertyOwner.email}`);
                    
                } else {
                    console.log('⚠️ No property owner found, notification not sent');
                }
                
                // Send confirmation notification to buyer (who requested the tour)
                if (buyer) {
                    await sendToUser({
                        mongoUserId: buyer._id.toString(),
                        title: "✅ Tour Request Submitted",
                        message: `Your tour request for "${propertyTitle}" on ${date} at ${time} has been submitted. The realtor will contact you soon.`,
                        data: {
                            type: "tour_confirmation",
                            screen: "my-tours",
                            tourId: tour._id.toString(),
                            propertyId: propertyId,
                            propertyTitle: propertyTitle,
                            date: date,
                            time: time
                        }
                    });
                    console.log(`✅ Tour confirmation notification sent to buyer: ${buyer.email}`);
                    
                    // Save notification to database for buyer
                    const buyerNotification = new Notification({
                        userId: buyer._id,
                        title: "✅ Tour Request Submitted",
                        message: `Your tour request for "${propertyTitle}" has been submitted successfully`,
                        type: "tour_confirmation",
                        data: {
                            tourId: tour._id.toString(),
                            propertyId: propertyId,
                            propertyTitle: propertyTitle,
                            date: date,
                            time: time
                        }
                    });
                    await buyerNotification.save();
                    
                    // Send email to buyer
                    const buyerEmailBody = `
                        <h2>✅ Tour Request Submitted</h2>
                        <p>Dear ${buyer.name},</p>
                        <p>Your tour request has been submitted successfully.</p>
                        <p><strong>Property:</strong> ${propertyTitle}</p>
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>Time:</strong> ${time}</p>
                        ${message ? `<p><strong>Your Message:</strong> ${message}</p>` : ''}
                        <br>
                        <p>The realtor will contact you soon to confirm the tour.</p>
                        <p>You can view all your tour requests in the "My Tours" section.</p>
                        <br>
                        <p>Best regards,<br>Elite CRM Team</p>
                    `;
                    
                    await sendEmail({
                        to: buyer.email,
                        subject: "✅ Tour Request Submitted Successfully",
                        body: buyerEmailBody,
                        fromEmail: process.env.EMAIL_USER,
                        fromName: "Elite CRM System"
                    });
                    console.log(`✅ Tour confirmation email sent to buyer: ${buyer.email}`);
                }
                
            } catch (notificationError) {
                console.error('❌ Failed to send tour notification:', notificationError.message);
                // Don't block tour creation if notification fails
            }
            // ================================================================
            
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
    
    // ✅ Get tours for property owner (realtor/admin)
    async getOwnerTours(req, res) {
        try {
            const ownerId = req.user.userId;
            
            // Find all tours where ownerId matches
            const tours = await Tour.find({ ownerId: ownerId }).sort({ createdAt: -1 });
            
            console.log(`📋 Owner ${ownerId} has ${tours.length} tour requests`);
            
            res.status(200).json({
                success: true,
                count: tours.length,
                data: tours
            });
        } catch (error) {
            console.error('❌ Get Owner Tours Error:', error);
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
            const ownerId = req.user.userId;
            
            const tour = await Tour.findOneAndUpdate(
                { _id: tourId, ownerId: ownerId },
                { status: 'confirmed' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found or you are not authorized'
                });
            }
            
            console.log(`✅ Tour accepted: ${tourId}`);
            
            // Send notification to buyer that tour is accepted
            try {
                const buyer = await User.findById(tour.userId);
                if (buyer) {
                    await sendToUser({
                        mongoUserId: buyer._id.toString(),
                        title: "✅ Tour Confirmed",
                        message: `Your tour for "${tour.propertyTitle}" on ${tour.date} at ${tour.time} has been confirmed.`,
                        data: {
                            type: "tour_accepted",
                            screen: "my-tours",
                            tourId: tour._id.toString(),
                            propertyId: tour.propertyId,
                            propertyTitle: tour.propertyTitle,
                            date: tour.date,
                            time: tour.time
                        }
                    });
                    console.log(`✅ Tour accepted notification sent to buyer: ${buyer.email}`);
                    
                    // Save notification to database for buyer
                    const buyerNotification = new Notification({
                        userId: buyer._id,
                        title: "✅ Tour Confirmed",
                        message: `Your tour for "${tour.propertyTitle}" has been confirmed`,
                        type: "tour_accepted",
                        data: {
                            tourId: tour._id.toString(),
                            propertyId: tour.propertyId,
                            propertyTitle: tour.propertyTitle,
                            date: tour.date,
                            time: tour.time
                        }
                    });
                    await buyerNotification.save();
                    
                    // Send email to buyer
                    const emailBody = `
                        <h2>✅ Tour Confirmed</h2>
                        <p>Dear ${buyer.name},</p>
                        <p>Your tour request has been <strong>confirmed</strong>.</p>
                        <p><strong>Property:</strong> ${tour.propertyTitle}</p>
                        <p><strong>Date:</strong> ${tour.date}</p>
                        <p><strong>Time:</strong> ${tour.time}</p>
                        <br>
                        <p>Please be on time for your tour.</p>
                        <p>Best regards,<br>Elite CRM Team</p>
                    `;
                    
                    await sendEmail({
                        to: buyer.email,
                        subject: "✅ Tour Confirmed",
                        body: emailBody,
                        fromEmail: process.env.EMAIL_USER,
                        fromName: "Elite CRM System"
                    });
                }
            } catch (err) {
                console.error('Failed to send acceptance notification:', err.message);
            }
            
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
            const ownerId = req.user.userId;
            
            const tour = await Tour.findOneAndUpdate(
                { _id: tourId, ownerId: ownerId },
                { status: 'rejected' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found or you are not authorized'
                });
            }
            
            console.log(`❌ Tour rejected: ${tourId}`);
            
            // Send notification to buyer that tour is rejected
            try {
                const buyer = await User.findById(tour.userId);
                if (buyer) {
                    await sendToUser({
                        mongoUserId: buyer._id.toString(),
                        title: "❌ Tour Request Declined",
                        message: `Your tour request for "${tour.propertyTitle}" has been declined.`,
                        data: {
                            type: "tour_rejected",
                            screen: "my-tours",
                            tourId: tour._id.toString(),
                            propertyId: tour.propertyId,
                            propertyTitle: tour.propertyTitle
                        }
                    });
                    console.log(`✅ Tour rejected notification sent to buyer: ${buyer.email}`);
                    
                    // Save notification to database for buyer
                    const buyerNotification = new Notification({
                        userId: buyer._id,
                        title: "❌ Tour Request Declined",
                        message: `Your tour request for "${tour.propertyTitle}" has been declined`,
                        type: "tour_rejected",
                        data: {
                            tourId: tour._id.toString(),
                            propertyId: tour.propertyId,
                            propertyTitle: tour.propertyTitle
                        }
                    });
                    await buyerNotification.save();
                    
                    // Send email to buyer
                    const emailBody = `
                        <h2>❌ Tour Request Declined</h2>
                        <p>Dear ${buyer.name},</p>
                        <p>Your tour request for <strong>${tour.propertyTitle}</strong> has been <strong>declined</strong>.</p>
                        <br>
                        <p>Please contact the realtor directly for more information.</p>
                        <p>Best regards,<br>Elite CRM Team</p>
                    `;
                    
                    await sendEmail({
                        to: buyer.email,
                        subject: "❌ Tour Request Declined",
                        body: emailBody,
                        fromEmail: process.env.EMAIL_USER,
                        fromName: "Elite CRM System"
                    });
                }
            } catch (err) {
                console.error('Failed to send rejection notification:', err.message);
            }
            
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
            const userId = req.user.userId;
            
            const tour = await Tour.findOneAndUpdate(
                { _id: tourId, $or: [{ userId: userId }, { ownerId: userId }] },
                { status: 'cancelled' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found or you are not authorized'
                });
            }
            
            console.log(`🚫 Tour cancelled: ${tourId}`);
            
            // Send notification to the other party
            try {
                const otherPartyId = tour.userId.toString() === userId ? tour.ownerId : tour.userId;
                if (otherPartyId) {
                    const otherParty = await User.findById(otherPartyId);
                    const canceller = await User.findById(userId);
                    
                    if (otherParty) {
                        await sendToUser({
                            mongoUserId: otherParty._id.toString(),
                            title: "🚫 Tour Cancelled",
                            message: `${canceller.name} cancelled the tour for "${tour.propertyTitle}"`,
                            data: {
                                type: "tour_cancelled",
                                screen: "my-tours",
                                tourId: tour._id.toString(),
                                propertyId: tour.propertyId,
                                propertyTitle: tour.propertyTitle
                            }
                        });
                        console.log(`✅ Tour cancellation notification sent to ${otherParty.email}`);
                    }
                }
            } catch (err) {
                console.error('Failed to send cancellation notification:', err.message);
            }
            
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
            const userId = req.user.userId;
            
            const tour = await Tour.findOneAndUpdate(
                { _id: tourId, userId: userId },
                { date, time, status: 'pending' },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Tour not found or you are not authorized'
                });
            }
            
            console.log(`📅 Tour rescheduled: ${tourId}`);
            
            // Send notification to property owner
            try {
                if (tour.ownerId) {
                    const owner = await User.findById(tour.ownerId);
                    const buyer = await User.findById(userId);
                    
                    if (owner) {
                        await sendToUser({
                            mongoUserId: owner._id.toString(),
                            title: "📅 Tour Rescheduled",
                            message: `${buyer.name} rescheduled the tour for "${tour.propertyTitle}" to ${date} at ${time}`,
                            data: {
                                type: "tour_rescheduled",
                                screen: "tours",
                                tourId: tour._id.toString(),
                                propertyId: tour.propertyId,
                                propertyTitle: tour.propertyTitle,
                                date: date,
                                time: time
                            }
                        });
                        console.log(`✅ Tour reschedule notification sent to owner: ${owner.email}`);
                    }
                }
            } catch (err) {
                console.error('Failed to send reschedule notification:', err.message);
            }
            
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
    // controllers/tour.controller.js mein ye method add karo

// ✅ Get builder's incoming tour requests
async getBuilderRequests(req, res) {
    try {
        const builderId = req.user.userId;
        
        // Find tours where ownerId matches this builder/realtor
        const tours = await Tour.find({ 
            ownerId: builderId,
            status: { $in: ['pending', 'confirmed', 'completed'] }
        }).sort({ createdAt: -1 });
        
        console.log(`📋 Builder ${builderId} has ${tours.length} incoming tour requests`);
        
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
}

module.exports = new TourController();