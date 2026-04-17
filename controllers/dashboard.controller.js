const Tour = require('../models/tour.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const Lead = require('../models/lead.model');
const LeadRequest = require('../models/leadRequest.model');

class DashboardController {
    // Get realtor dashboard stats (UPDATED with Lead Requests)
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
            
            // ✅ NEW: Get assigned leads from Lead model
            const assignedLeads = await Lead.find({ 
                assignedTo: realtorId,
                isActive: true 
            });
            
            const totalAssignedLeads = assignedLeads.length;
            const hotAssignedLeads = assignedLeads.filter(l => l.status === 'Hot').length;
            const warmAssignedLeads = assignedLeads.filter(l => l.status === 'Warm').length;
            const coldAssignedLeads = assignedLeads.filter(l => l.status === 'Cold').length;
            
            // ✅ NEW: Get lead requests made by this realtor
            const leadRequests = await LeadRequest.find({ realtorId: realtorId });
            
            const totalRequests = leadRequests.length;
            const pendingRequests = leadRequests.filter(r => r.status === 'pending').length;
            const approvedRequests = leadRequests.filter(r => r.status === 'approved').length;
            const rejectedRequests = leadRequests.filter(r => r.status === 'rejected').length;
            
            // Get recent leads (last 5) from Tour
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
            
            // ✅ NEW: Get recent assigned leads (last 5) from Lead model
            const recentAssignedLeads = await Lead.find({ 
                assignedTo: realtorId,
                isActive: true 
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email phone propertyType budget location status stage score createdAt');
            
            // ✅ NEW: Get recent requests (last 5)
            const recentRequests = await LeadRequest.find({ 
                realtorId: realtorId 
            })
            .sort({ createdAt: -1 })
            .limit(5);
            
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
                    // Property stats
                    totalProperties,
                    pendingTours,
                    
                    // Tour leads (from website/app inquiries)
                    tourLeads: {
                        total: totalLeads,
                        new: newLeads
                    },
                    
                    // ✅ NEW: Assigned leads (from admin)
                    assignedLeads: {
                        total: totalAssignedLeads,
                        hot: hotAssignedLeads,
                        warm: warmAssignedLeads,
                        cold: coldAssignedLeads
                    },
                    
                    // ✅ NEW: Lead requests stats
                    leadRequests: {
                        total: totalRequests,
                        pending: pendingRequests,
                        approved: approvedRequests,
                        rejected: rejectedRequests
                    },
                    
                    // Recent items
                    recentLeads,
                    recentAssignedLeads,
                    recentRequests,
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
    
    // Get all tour leads (for leads screen)
    async getAllTourLeads(req, res) {
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
            console.error('❌ Get all tour leads error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ NEW: Get all assigned leads (from admin)
    async getAllAssignedLeads(req, res) {
        try {
            const realtorId = req.user.userId;
            
            const { page = 1, limit = 10, status, stage, search } = req.query;
            
            let query = { 
                assignedTo: realtorId,
                isActive: true 
            };
            
            if (status && status !== 'All') {
                query.status = status;
            }
            
            if (stage && stage !== 'All') {
                query.stage = stage;
            }
            
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ];
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const leads = await Lead.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('name email phone propertyType budget location status priority stage score notes createdAt lastContact');
            
            const total = await Lead.countDocuments(query);
            
            res.status(200).json({
                success: true,
                data: {
                    leads,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Get all assigned leads error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ NEW: Get all lead requests made by this realtor
    async getAllLeadRequests(req, res) {
        try {
            const realtorId = req.user.userId;
            
            const { page = 1, limit = 10, status } = req.query;
            
            let query = { realtorId: realtorId };
            
            if (status && status !== 'All') {
                query.status = status;
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const requests = await LeadRequest.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await LeadRequest.countDocuments(query);
            
            res.status(200).json({
                success: true,
                data: {
                    requests,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Get all lead requests error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Update tour lead status
    async updateTourLeadStatus(req, res) {
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
            console.error('❌ Update tour lead status error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ NEW: Update assigned lead stage
    async updateAssignedLeadStage(req, res) {
        try {
            const { leadId } = req.params;
            const { stage } = req.body;
            const realtorId = req.user.userId;
            
            const validStages = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
            
            if (!validStages.includes(stage)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid stage'
                });
            }
            
            const lead = await Lead.findOne({ _id: leadId, assignedTo: realtorId });
            
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found or not assigned to you'
                });
            }
            
            lead.stage = stage;
            lead.calculateScore();
            await lead.save();
            
            res.status(200).json({
                success: true,
                message: `Lead stage updated to ${stage}`,
                data: { id: lead._id, stage: lead.stage, score: lead.score }
            });
            
        } catch (error) {
            console.error('❌ Update assigned lead stage error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ✅ NEW: Get single assigned lead details
    async getAssignedLeadDetails(req, res) {
        try {
            const { leadId } = req.params;
            const realtorId = req.user.userId;
            
            const lead = await Lead.findOne({ 
                _id: leadId, 
                assignedTo: realtorId,
                isActive: true 
            }).select('-__v');
            
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found or not assigned to you'
                });
            }
            
            res.status(200).json({
                success: true,
                data: lead
            });
            
        } catch (error) {
            console.error('❌ Get assigned lead details error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new DashboardController();