const LeadRequest = require('../models/leadRequest.model');
const Lead = require('../models/lead.model');
const User = require('../models/user.model');

class LeadRequestController {
    
    // ==================== REALTOR: CREATE REQUEST ====================
    async createRequest(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);
            
            if (!user || user.role !== 'realtor') {
                return res.status(403).json({
                    success: false,
                    message: 'Only realtors can request leads'
                });
            }
            
            const {
                country, city, location, area, propertyType, propertyCategory,
                priceRange, additionalNote
            } = req.body;
            
            // Validation
            if (!country || !city || !location || !area || !propertyType || !propertyCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Country, city, location, area, property type and category are required'
                });
            }
            
            const request = new LeadRequest({
                realtorId: userId,
                realtorName: user.name,
                realtorEmail: user.email,
                realtorPhone: user.phone,
                country,
                city,
                location,
                area,
                propertyType,
                propertyCategory,
                priceRange,
                additionalNote,
                status: 'pending'
            });
            
            await request.save();
            
            res.status(201).json({
                success: true,
                message: 'Lead request submitted successfully',
                data: request
            });
        } catch (error) {
            console.error('Create request error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== REALTOR: GET MY REQUESTS ====================
    async getMyRequests(req, res) {
        try {
            const userId = req.user.userId;
            
            const requests = await LeadRequest.find({ realtorId: userId })
                .sort({ createdAt: -1 });
            
            const stats = {
                total: requests.length,
                pending: requests.filter(r => r.status === 'pending').length,
                approved: requests.filter(r => r.status === 'approved').length,
                rejected: requests.filter(r => r.status === 'rejected').length
            };
            
            res.status(200).json({
                success: true,
                data: { requests, stats }
            });
        } catch (error) {
            console.error('Get my requests error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== ADMIN: GET ALL REQUESTS ====================
    async getAllRequests(req, res) {
        try {
            const { status, country, city, page = 1, limit = 20 } = req.query;
            
            let query = { isActive: true };
            if (status && status !== 'all') {
                query.status = status;
            }
            if (country && country !== 'all') {
                query.country = { $regex: country, $options: 'i' };
            }
            if (city && city !== 'all') {
                query.city = { $regex: city, $options: 'i' };
            }
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const requests = await LeadRequest.find(query)
                .populate('realtorId', 'name email phone agencyName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await LeadRequest.countDocuments(query);
            
            const stats = {
                pending: await LeadRequest.countDocuments({ status: 'pending', isActive: true }),
                approved: await LeadRequest.countDocuments({ status: 'approved', isActive: true }),
                rejected: await LeadRequest.countDocuments({ status: 'rejected', isActive: true }),
                total: await LeadRequest.countDocuments({ isActive: true })
            };
            
            res.status(200).json({
                success: true,
                data: {
                    requests,
                    stats,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get all requests error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== ADMIN: GET SINGLE REQUEST ====================
    async getRequestById(req, res) {
        try {
            const { id } = req.params;
            
            const request = await LeadRequest.findById(id)
                .populate('realtorId', 'name email phone agencyName')
                .populate('assignedLeads');
            
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: request
            });
        } catch (error) {
            console.error('Get request by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== ADMIN: APPROVE REQUEST & ASSIGN LEADS ====================
    async approveRequest(req, res) {
        try {
            const { id } = req.params;
            const { leadIds, adminNote } = req.body;
            
            const request = await LeadRequest.findById(id);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found'
                });
            }
            
            if (request.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Request already ${request.status}`
                });
            }
            
            // Assign leads to realtor
            if (leadIds && leadIds.length > 0) {
                await Lead.updateMany(
                    { _id: { $in: leadIds } },
                    { 
                        assignedTo: request.realtorId,
                        assignedToName: request.realtorName,
                        stage: 'Qualified',
                        location: request.location,
                        city: request.city,
                        country: request.country
                    }
                );
                request.assignedLeads = leadIds;
            }
            
            request.status = 'approved';
            request.reviewedBy = req.user.userId;
            request.reviewedAt = new Date();
            request.adminRejectionReason = null;
            
            await request.save();
            
            res.status(200).json({
                success: true,
                message: `Request approved. ${leadIds?.length || 0} leads assigned.`,
                data: request
            });
        } catch (error) {
            console.error('Approve request error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== ADMIN: REJECT REQUEST ====================
    async rejectRequest(req, res) {
        try {
            const { id } = req.params;
            const { rejectionReason } = req.body;
            
            if (!rejectionReason) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required'
                });
            }
            
            const request = await LeadRequest.findById(id);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found'
                });
            }
            
            if (request.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Request already ${request.status}`
                });
            }
            
            request.status = 'rejected';
            request.adminRejectionReason = rejectionReason;
            request.reviewedBy = req.user.userId;
            request.reviewedAt = new Date();
            
            await request.save();
            
            res.status(200).json({
                success: true,
                message: 'Request rejected',
                data: request
            });
        } catch (error) {
            console.error('Reject request error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== ADMIN: DELETE REQUEST ====================
    async deleteRequest(req, res) {
        try {
            const { id } = req.params;
            
            const request = await LeadRequest.findByIdAndDelete(id);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Request deleted successfully'
            });
        } catch (error) {
            console.error('Delete request error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET PENDING REQUESTS COUNT ====================
    async getPendingCount(req, res) {
        try {
            const count = await LeadRequest.countDocuments({ status: 'pending', isActive: true });
            
            res.status(200).json({
                success: true,
                data: { pendingCount: count }
            });
        } catch (error) {
            console.error('Get pending count error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET REQUESTS BY COUNTRY/CITY ====================
    async getRequestsByLocation(req, res) {
        try {
            const { country, city } = req.query;
            
            let query = { isActive: true, status: 'pending' };
            if (country) query.country = { $regex: country, $options: 'i' };
            if (city) query.city = { $regex: city, $options: 'i' };
            
            const requests = await LeadRequest.find(query)
                .populate('realtorId', 'name email phone')
                .sort({ createdAt: -1 });
            
            res.status(200).json({
                success: true,
                data: requests
            });
        } catch (error) {
            console.error('Get requests by location error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new LeadRequestController();