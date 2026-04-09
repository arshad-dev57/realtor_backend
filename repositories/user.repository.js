const User = require('../models/user.model');

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async findByEmail(email, includePassword = false) {
        const query = User.findOne({ email, isActive: true });
        if (includePassword) {
            query.select('+password');
        }
        return await query;
    }

    async findById(id, includePassword = false) {
        const query = User.findById(id);
        if (includePassword) {
            query.select('+password');
        }
        return await query;
    }

    async update(id, updateData) {
        return await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
    }

    async delete(id) {
        return await User.findByIdAndUpdate(id, { isActive: false });
    }

    async exists(email) {
        return await User.exists({ email, isActive: true });
    }
}

module.exports = new UserRepository();