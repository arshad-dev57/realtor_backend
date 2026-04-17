// backend/models/property.model.js

const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
{
    // Basic Info
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    // Main Image
    imageUrl: {
        type: String,
        required: true,
        trim: true
    },

    // Gallery Images
    images: [
        {
            type: String,
            trim: true
        }
    ],

    // Amenities (Array / Object both allowed)
    amenities: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },

    // Category Images
    bedroomImages: [{ type: String }],
    bathroomImages: [{ type: String }],
    kitchenImages: [{ type: String }],
    livingImages: [{ type: String }],
    exteriorImages: [{ type: String }],

    // Pricing
    price: {
        type: Number,
        required: true,
        min: 0
    },

    priceDisplay: {
        type: String,
        required: true,
        trim: true
    },

    // Listing Type
    type: {
        type: String,
        enum: ["For Sale", "For Rent", "Commercial"],
        required: true
    },

    // Property Type
    propertyType: {
        type: String,
        enum: [
            "House",
            "Condo",
            "Townhome",
            "Multi Family",
            "Mobile",
            "Farm",
            "Land",
            "Co-op",
            "Condop"
        ],
        default: "House"
    },

    // Location
    location: {
        city: {
            type: String,
            required: true,
            trim: true
        },

        state: {
            type: String,
            required: true,
            trim: true
        },

        address: {
            type: String,
            required: true,
            trim: true
        },

        coordinates: {
            lat: {
                type: Number,
                default: 0
            },

            lng: {
                type: Number,
                default: 0
            }
        }
    },

    // Rooms
    bedrooms: {
        type: Number,
        required: true,
        min: 0
    },

    bathrooms: {
        type: Number,
        required: true,
        min: 0
    },

    // Area
    area: {
        value: {
            type: Number,
            required: true,
            min: 0
        },

        unit: {
            type: String,
            default: "sqft"
        },

        display: {
            type: String,
            required: true
        }
    },

    parking: {
        type: Number,
        default: 0
    },

    // Builder Info
    builderName: {
        type: String,
        default: ""
    },

    // Flood Info
    floodRisk: {
        type: String,
        default: ""
    },

    floodFactor: {
        type: Number,
        default: 0
    },

    // Monthly Cost
    principalInterest: {
        type: Number,
        default: 0
    },

    propertyTax: {
        type: Number,
        default: 0
    },

    homeInsurance: {
        type: Number,
        default: 0
    },

    hoaFees: {
        type: Number,
        default: 0
    },

    // Details
    yearBuilt: {
        type: Number,
        default: 0
    },

    stories: {
        type: String,
        default: "Single"
    },

    garageSpaces: {
        type: Number,
        default: 0
    },

    lotSize: {
        type: Number,
        default: 0
    },

    // Features
    features: [
        {
            type: String
        }
    ],

    // Flags
    isNew: {
        type: Boolean,
        default: false
    },

    isFeatured: {
        type: Boolean,
        default: false
    },

    veteransBenefits: {
        type: Boolean,
        default: false
    },

    // Status
    status: {
        type: String,
        enum: ["available", "sold", "pending"],
        default: "available"
    },

    // Realtor
    realtorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
},
{
    timestamps: true
}
);

module.exports = mongoose.model("Property", propertySchema);