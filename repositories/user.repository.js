const User = require('../models/user.model');

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }
    
    async findByEmailOrPhone(email, phone) {
        return await User.findOne({
            $or: [{ email }, { phone }]
        });
    }
    
    async findByEmailWithPassword(email) {
        return await User.findOne({ email }).select('+password');
    }
    
    async findById(id) {
        return await User.findById(id);
    }
    
    async findByLicenseNumber(licenseNumber, excludeUserId) {
        return await User.findOne({
            licenseNumber,
            _id: { $ne: excludeUserId }
        });
    }
    
    async update(id, updateData) {
        return await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
    }
    
}


module.exports = new UserRepository();  