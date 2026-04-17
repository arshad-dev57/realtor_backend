const Lead = require('../models/lead.model');
const User = require('../models/user.model');

class LeadController {
    
    // ==================== CREATE LEAD ====================
    async createLead(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);
            
            const {
                name, email, phone, propertyType, budget, budgetMin, budgetMax,
                location, source, status, priority, stage, notes, assignedTo
            } = req.body;
            
            if (!name || !email || !phone || !budget || !location) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, phone, budget, and location are required'
                });
            }
            
            // Calculate score
            let leadData = {
                name, email, phone, propertyType, budget, budgetMin, budgetMax,
                location, source, status, priority, stage, notes,
                createdBy: userId,
                score: 50
            };
            
            // Assign to realtor if specified
            if (assignedTo) {
                const assignedUser = await User.findById(assignedTo);
                if (assignedUser && assignedUser.role === 'realtor') {
                    leadData.assignedTo = assignedTo;
                    leadData.assignedToName = assignedUser.name;
                }
            }
            
            const lead = new Lead(leadData);
            lead.calculateScore();
            await lead.save();
            
            // Populate assignedTo details
            await lead.populate('assignedTo', 'name email');
            await lead.populate('createdBy', 'name email');
            
            res.status(201).json({
                success: true,
                message: 'Lead created successfully',
                data: lead
            });
        } catch (error) {
            console.error('Create lead error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET ALL LEADS ====================
    async getAllLeads(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                source,
                status,
                stage,
                priority,
                assignedTo,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;
            
            const query = { isActive: true };
            
            // Search filter
            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } }
                ];
            }
            
            // Filters
            if (source && source !== 'All') query.source = source;
            if (status && status !== 'All') query.status = status;
            if (stage && stage !== 'All') query.stage = stage;
            if (priority && priority !== 'All') query.priority = priority;
            if (assignedTo && assignedTo !== 'All') query.assignedTo = assignedTo;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
            
            const leads = await Lead.find(query)
                .populate('assignedTo', 'name email')
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));
            
            const total = await Lead.countDocuments(query);
            
            // Calculate stats
            const hotLeads = await Lead.countDocuments({ ...query, status: 'Hot' });
            const warmLeads = await Lead.countDocuments({ ...query, status: 'Warm' });
            const closedWon = await Lead.countDocuments({ ...query, stage: 'Closed Won' });
            const inNegotiation = await Lead.countDocuments({ ...query, stage: 'Negotiation' });
            
            res.status(200).json({
                success: true,
                data: {
                    leads,
                    stats: {
                        total,
                        hot: hotLeads,
                        warm: warmLeads,
                        closedWon,
                        inNegotiation
                    },
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / parseInt(limit)),
                        totalItems: total,
                        itemsPerPage: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get all leads error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET LEADS BY REALTOR ====================
    async getLeadsByRealtor(req, res) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);
            
            let query = { isActive: true };
            
            // If realtor, show only assigned leads
            if (user.role === 'realtor') {
                query.assignedTo = userId;
            }
            // If admin, show all leads (no filter)
            
            const leads = await Lead.find(query)
                .populate('assignedTo', 'name email')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });
            
            const stats = {
                total: leads.length,
                hot: leads.filter(l => l.status === 'Hot').length,
                warm: leads.filter(l => l.status === 'Warm').length,
                cold: leads.filter(l => l.status === 'Cold').length,
                byStage: {
                    prospecting: leads.filter(l => l.stage === 'Prospecting').length,
                    qualified: leads.filter(l => l.stage === 'Qualified').length,
                    proposal: leads.filter(l => l.stage === 'Proposal').length,
                    negotiation: leads.filter(l => l.stage === 'Negotiation').length,
                    closedWon: leads.filter(l => l.stage === 'Closed Won').length,
                    closedLost: leads.filter(l => l.stage === 'Closed Lost').length
                }
            };
            
            res.status(200).json({
                success: true,
                data: {
                    leads,
                    stats
                }
            });
        } catch (error) {
            console.error('Get leads by realtor error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET SINGLE LEAD ====================
    async getLeadById(req, res) {
        try {
            const { id } = req.params;
            
            const lead = await Lead.findById(id)
                .populate('assignedTo', 'name email phone agencyName')
                .populate('createdBy', 'name email');
            
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: lead
            });
        } catch (error) {
            console.error('Get lead by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== UPDATE LEAD ====================
    async updateLead(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            const lead = await Lead.findById(id);
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }
            
            // Update fields
            Object.keys(updates).forEach(key => {
                if (key !== '_id' && key !== '__v') {
                    lead[key] = updates[key];
                }
            });
            
            // Recalculate score
            lead.calculateScore();
            
            // If assignedTo changed, update assignedToName
            if (updates.assignedTo && updates.assignedTo !== lead.assignedTo) {
                const assignedUser = await User.findById(updates.assignedTo);
                if (assignedUser) {
                    lead.assignedToName = assignedUser.name;
                }
            }
            
            await lead.save();
            await lead.populate('assignedTo', 'name email');
            await lead.populate('createdBy', 'name email');
            
            res.status(200).json({
                success: true,
                message: 'Lead updated successfully',
                data: lead
            });
        } catch (error) {
            console.error('Update lead error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== ASSIGN LEAD TO REALTOR ====================
    async assignLeadToRealtor(req, res) {
        try {
            const { id } = req.params;
            const { realtorId } = req.body;
            
            const lead = await Lead.findById(id);
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }
            
            const realtor = await User.findById(realtorId);
            if (!realtor || realtor.role !== 'realtor') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid realtor'
                });
            }
            
            lead.assignedTo = realtorId;
            lead.assignedToName = realtor.name;
            lead.stage = 'Qualified';
            lead.calculateScore();
            await lead.save();
            
            res.status(200).json({
                success: true,
                message: `Lead assigned to ${realtor.name}`,
                data: lead
            });
        } catch (error) {
            console.error('Assign lead error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== UPDATE LEAD STAGE ====================
    async updateLeadStage(req, res) {
        try {
            const { id } = req.params;
            const { stage } = req.body;
            
            const validStages = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
            if (!validStages.includes(stage)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid stage'
                });
            }
            
            const lead = await Lead.findById(id);
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }
            
            lead.stage = stage;
            lead.calculateScore();
            await lead.save();
            
            res.status(200).json({
                success: true,
                message: `Lead stage updated to ${stage}`,
                data: lead
            });
        } catch (error) {
            console.error('Update lead stage error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== DELETE LEAD ====================
    async deleteLead(req, res) {
        try {
            const { id } = req.params;
            
            const lead = await Lead.findByIdAndDelete(id);
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: 'Lead not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Lead deleted successfully'
            });
        } catch (error) {
            console.error('Delete lead error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // ==================== GET LEAD STATS ====================
    async getLeadStats(req, res) {
        try {
            const total = await Lead.countDocuments({ isActive: true });
            const hot = await Lead.countDocuments({ status: 'Hot', isActive: true });
            const warm = await Lead.countDocuments({ status: 'Warm', isActive: true });
            const cold = await Lead.countDocuments({ status: 'Cold', isActive: true });
            
            const byStage = {
                Prospecting: await Lead.countDocuments({ stage: 'Prospecting', isActive: true }),
                Qualified: await Lead.countDocuments({ stage: 'Qualified', isActive: true }),
                Proposal: await Lead.countDocuments({ stage: 'Proposal', isActive: true }),
                Negotiation: await Lead.countDocuments({ stage: 'Negotiation', isActive: true }),
                'Closed Won': await Lead.countDocuments({ stage: 'Closed Won', isActive: true }),
                'Closed Lost': await Lead.countDocuments({ stage: 'Closed Lost', isActive: true })
            };
            
            const bySource = {
                Referral: await Lead.countDocuments({ source: 'Referral', isActive: true }),
                Website: await Lead.countDocuments({ source: 'Website', isActive: true }),
                'Social Media': await Lead.countDocuments({ source: 'Social Media', isActive: true }),
                'Cold Outreach': await Lead.countDocuments({ source: 'Cold Outreach', isActive: true }),
                Events: await Lead.countDocuments({ source: 'Events', isActive: true })
            };
            
            res.status(200).json({
                success: true,
                data: {
                    total,
                    hot,
                    warm,
                    cold,
                    byStage,
                    bySource
                }
            });
        } catch (error) {
            console.error('Get lead stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new LeadController();  