const Tour = require('../models/tour.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');

class DashboardController {
    // Get realtor dashboard stats
    async getDashboardStats(req, res) {
        try {
            const realtorId = req.user.userId;
            
            console.log('📊 Fetching dashboard stats for realtor:', realtorId);
            
            // Get all properties of this realtor
            const properties = await Property.find({ realtorId });
            const totalProperties = properties.length;
            
            // Get property IDs
            const propertyIds = properties.map(p => p._id);
            
            // Get pending tours for these properties
            const pendingTours = await Tour.countDocuments({
                propertyId: { $in: propertyIds },
                status: 'pending'
            });
            
            // Get all leads (users who requested tours or inquiries)
            const allLeads = await Tour.find({ 
                propertyId: { $in: propertyIds },
                status: { $in: ['pending', 'confirmed', 'completed'] }
            }).populate('userId', 'name email phone');
            
            const totalLeads = allLeads.length;
            const newLeads = allLeads.filter(l => l.status === 'pending').length;
            
            // Get recent leads (last 5)
            const recentLeadsData = await Tour.find({ 
                propertyId: { $in: propertyIds }
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'name email phone');
            
            const recentLeads = recentLeadsData.map(lead => ({
                id: lead._id,
                name: lead.userId?.name || lead.name,
                email: lead.userId?.email || lead.email,
                phone: lead.userId?.phone || lead.phone,
                interestedIn: lead.propertyTitle,
                status: lead.status,
                date: lead.createdAt,
                message: lead.message || lead.notes || ''
            }));
            
            // Get upcoming tours
            const upcomingToursData = await Tour.find({
                propertyId: { $in: propertyIds },
                status: { $in: ['pending', 'confirmed'] },
                date: { $gte: new Date().toISOString().split('T')[0] }
            })
            .sort({ date: 1, time: 1 })
            .limit(5);
            
            const upcomingTours = upcomingToursData.map(tour => ({
                id: tour._id,
                customerName: tour.name,
                propertyTitle: tour.propertyTitle,
                date: tour.date,
                time: tour.time,
                status: tour.status
            }));
            
            res.status(200).json({
                success: true,
                data: {
                    totalProperties,
                    pendingTours,
                    newLeads,
                    totalLeads,
                    recentLeads,
                    upcomingTours
                }
            });
            
        } catch (error) {
            console.error('❌ Dashboard stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Get all leads (for leads screen)
    async getAllLeads(req, res) {
        try {
            const realtorId = req.user.userId;
            
            const properties = await Property.find({ realtorId });
            const propertyIds = properties.map(p => p._id);
            
            const leads = await Tour.find({ 
                propertyId: { $in: propertyIds }
            })
            .sort({ createdAt: -1 })
            .populate('userId', 'name email phone');
            
            const formattedLeads = leads.map(lead => ({
                id: lead._id,
                name: lead.userId?.name || lead.name,
                email: lead.userId?.email || lead.email,
                phone: lead.userId?.phone || lead.phone,
                interestedIn: lead.propertyTitle,
                status: lead.status,
                date: lead.createdAt,
                message: lead.message || lead.notes || ''
            }));
            
            res.status(200).json({
                success: true,
                data: formattedLeads
            });
            
        } catch (error) {
            console.error('❌ Get all leads error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Update lead status
    async updateLeadStatus(req, res) {
        try {
            const { leadId } = req.params;
            const { status } = req.body;
            
            const validStatuses = ['new', 'contacted', 'viewed', 'negotiation', 'completed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }
            
            const tour = await Tour.findByIdAndUpdate(
                leadId,
                { status },
                { new: true }
            );
            
            if (!tour) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Lead status updated',
                data: { id: tour._id, status: tour.status }
            });
            
        } catch (error) {
            console.error('❌ Update lead status error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new DashboardController();