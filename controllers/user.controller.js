// controllers/user.controller.js

const User = require('../models/user.model');

class UserController {
    
    // Get all buyers (role = 'buyer')
    async getAllBuyers(req, res) {
        try {
            const buyers = await User.find({ role: 'buyer' })
                .select('-password -__v -resetPasswordToken -resetPasswordExpires')
                .sort({ createdAt: -1 }); // Latest first
            
            if (!buyers || buyers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No buyers found'
                });
            }
            
            res.status(200).json({
                success: true,
                count: buyers.length,
                data: buyers
            });
        } catch (error) {
            console.error('Error fetching buyers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch buyers',
                error: error.message
            });
        }
    }
    
    // Get all realtors (role = 'realtor')
    async getAllRealtors(req, res) {
        try {
            const realtors = await User.find({ role: 'realtor' })
                .select('-password -__v -resetPasswordToken -resetPasswordExpires')
                .sort({ createdAt: -1 });
            
            if (!realtors || realtors.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No realtors found'
                });
            }
            
            res.status(200).json({
                success: true,
                count: realtors.length,
                data: realtors
            });
        } catch (error) {
            console.error('Error fetching realtors:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch realtors',
                error: error.message
            });
        }
    }
    
    // Get all users (all roles)
    async getAllUsers(req, res) {
        try {
            const users = await User.find({})
                .select('-password -__v -resetPasswordToken -resetPasswordExpires')
                .sort({ createdAt: -1 });
            
            if (!users || users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No users found'
                });
            }
            
            // Group by role for better response
            const buyers = users.filter(u => u.role === 'buyer');
            const realtors = users.filter(u => u.role === 'realtor');
            const admins = users.filter(u => u.role === 'admin');
            
            res.status(200).json({
                success: true,
                total: users.length,
                data: {
                    all: users,
                    buyers: {
                        count: buyers.length,
                        list: buyers
                    },
                    realtors: {
                        count: realtors.length,
                        list: realtors
                    },
                    admins: {
                        count: admins.length,
                        list: admins
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: error.message
            });
        }
    }
    
    // Get single user by ID
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            
            const user = await User.findById(id)
                .select('-password -__v -resetPasswordToken -resetPasswordExpires');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user',
                error: error.message
            });
        }
    }
    
    // Update user status (active/inactive)
    async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            
            const user = await User.findByIdAndUpdate(
                id,
                { isActive: isActive },
                { new: true, runValidators: true }
            ).select('-password -__v');
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: `User status updated to ${isActive ? 'active' : 'inactive'}`,
                data: user
            });
        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user status',
                error: error.message
            });
        }
    }
    
    // Delete user
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            const user = await User.findByIdAndDelete(id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: `User ${user.name} deleted successfully`,
                data: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    }
    // Get all realtors
async getAllRealtors(req, res) {
    try {
        const realtors = await User.find({ role: 'realtor' })
            .select('-password -__v -resetPasswordToken -resetPasswordExpires')
            .sort({ createdAt: -1 });
        
        if (!realtors || realtors.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No realtors found'
            });
        }
        
        // Calculate stats
        const totalVolume = realtors.reduce((sum, r) => sum + (r.totalVolume || 0), 0);
        const totalSales = realtors.reduce((sum, r) => sum + (r.totalSales || 0), 0);
        const activeCount = realtors.filter(r => r.isProfileComplete === true).length;
        const platinumCount = realtors.filter(r => r.tier === 'Platinum').length;
        
        res.status(200).json({
            success: true,
            count: realtors.length,
            stats: {
                totalVolume: totalVolume,
                totalSales: totalSales,
                activeCount: activeCount,
                platinumCount: platinumCount
            },
            data: realtors
        });
    } catch (error) {
        console.error('Error fetching realtors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch realtors',
            error: error.message
        });
    }
}

// Get single realtor by ID
async getRealtorById(req, res) {
    try {
        const { id } = req.params;
        
        const realtor = await User.findOne({ _id: id, role: 'realtor' })
            .select('-password -__v -resetPasswordToken -resetPasswordExpires');
        
        if (!realtor) {
            return res.status(404).json({
                success: false,
                message: 'Realtor not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: realtor
        });
    } catch (error) {
        console.error('Error fetching realtor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch realtor',
            error: error.message
        });
    }
}

// Update realtor status
async updateRealtorStatus(req, res) {
    try {
        const { id } = req.params;
        const { isActive, tier, totalSales, totalVolume, activeListing } = req.body;
        
        const updateData = {};
        if (isActive !== undefined) updateData.isActive = isActive;
        if (tier !== undefined) updateData.tier = tier;
        if (totalSales !== undefined) updateData.totalSales = totalSales;
        if (totalVolume !== undefined) updateData.totalVolume = totalVolume;
        if (activeListing !== undefined) updateData.activeListing = activeListing;
        
        const realtor = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -__v');
        
        if (!realtor) {
            return res.status(404).json({
                success: false,
                message: 'Realtor not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Realtor updated successfully',
            data: realtor
        });
    } catch (error) {
        console.error('Error updating realtor:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update realtor',
            error: error.message
        });
    }
}
}

module.exports = new UserController();