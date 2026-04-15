// backend/models/property.model.js
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    images: [{ type: String }],
    
      amenities: {
        type: mongoose.Schema.Types.Mixed,  // Can be Array or Object
        default: []
    },
    // Category-wise images
    bedroomImages: [{ type: String }],
    bathroomImages: [{ type: String }],
    kitchenImages: [{ type: String }],
    livingImages: [{ type: String }],
    exteriorImages: [{ type: String }],
    
    price: { type: Number, required: true },
    priceDisplay: { type: String, required: true },
    type: { type: String, enum: ['For Sale', 'For Rent', 'Commercial'], required: true },
    propertyType: { type: String, enum: ['House', 'Condo', 'Townhome', 'Multi Family', 'Mobile', 'Farm', 'Land', 'Co-op', 'Condop'], default: 'House' },
    
    location: {
        city: { type: String, required: true },
        state: { type: String, required: true },
        address: { type: String, required: true },
        coordinates: { lat: Number, lng: Number }
    },
    veteransBenefits: { type: Boolean, default: false },

    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    area: {
        value: { type: Number, required: true },
        unit: { type: String, default: 'sqft' },
        display: { type: String, required: true }
    },
    parking: { type: Number, default: 0 },
    
    // ✅ Builder Info (from realtor)
    builderName: { type: String, default: '' },
    
    // Flood Info
    floodRisk: { type: String, default: '' },
    floodFactor: { type: Number, default: 0 },
    
    // Monthly Costs
    principalInterest: { type: Number, default: 0 },
    propertyTax: { type: Number, default: 0 },
    homeInsurance: { type: Number, default: 0 },
    hoaFees: { type: Number, default: 0 },
    
    // Property Details
    yearBuilt: { type: Number, default: 0 },
    stories: { type: String, default: 'Single' },
    garageSpaces: { type: Number, default: 0 },
    lotSize: { type: Number, default: 0 },
    
    features: [{ type: String }],
    isNew: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ['available', 'sold', 'pending'], default: 'available' },
    veteransBenefits: { type: Boolean, default: false },
    
    realtorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);