// backend/controllers/property.controller.js
const Property = require('../models/property.model');
const { cloudinary } = require('../config/cloudinary.config');


function getTimeAgo(date) {
    if (!date) return 'Recently';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;

    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));


    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}



class PropertyController {
        
    getPublicIdFromUrl(url) {
        if (!url) return null;
        try {
            const parts = url.split('/');
            const filename = parts[parts.length - 1];
            const versionIndex = parts.indexOf('upload') + 1;
            const folder = parts.slice(versionIndex + 1, -1).join('/');
            const publicId = `${folder}/${filename.split('.')[0]}`;
            return publicId;
        } catch (error) {
            console.error('Error extracting public ID:', error);
            return null;
        }
    }

    async deleteImage(imageUrl) {
        if (!imageUrl) return;
        try {
            const publicId = this.getPublicIdFromUrl(imageUrl);
            if (publicId) {
                console.log(`🗑️ Deleting image: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
                console.log(`✅ Image deleted: ${publicId}`);
            }
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    }

    async deleteImages(imageUrls) {
        if (!imageUrls || imageUrls.length === 0) return;
        for (const url of imageUrls) {
            await this.deleteImage(url);
        }
    }
// backend/controllers/property.controller.js - Fix addProperty method

async addProperty(req, res) {
    console.log('\n========== ADD PROPERTY START ==========');
    
    try {
        const userId = req.user.userId;
        console.log(`📝 User ID: ${userId}`);
        
        // Parse property data
        let propertyData;
        if (typeof req.body.propertyData === 'string') {
            propertyData = JSON.parse(req.body.propertyData);
        } else {
            propertyData = req.body;
        }
        
        console.log('✅ Parsed propertyData:', JSON.stringify(propertyData, null, 2));
        
        // Process files
        let files = [];
        if (req.files && typeof req.files === 'object') {
            for (const key in req.files) {
                if (Array.isArray(req.files[key])) {
                    files.push(...req.files[key]);
                }
            }
        }
        
        // Get main image
        const mainImageFile = files.find(f => f && f.fieldname === 'mainImage');
        const imageUrl = mainImageFile ? mainImageFile.path : '';
        
        // Collect all additional images
        const allImages = [];
        const imageFields = ['bedroomImages', 'bathroomImages', 'kitchenImages', 'livingImages', 'exteriorImages'];
        
        for (const field of imageFields) {
            const fieldFiles = files.filter(f => f && f.fieldname === field);
            allImages.push(...fieldFiles.map(f => f.path));
        }
        
        console.log(`📸 Main Image: ${imageUrl ? 'Yes' : 'No'}`);
        console.log(`📸 Additional Images: ${allImages.length}`);
        
        // Parse features
        let features = [];
        try {
            features = typeof propertyData.features === 'string' 
                ? JSON.parse(propertyData.features) 
                : (propertyData.features || []);
        } catch (e) {
            console.error('Error parsing features:', e.message);
        }
        
        // ✅ CRITICAL FIX: Extract location correctly
        const location = {
            address: propertyData.location?.address || propertyData.address || '',
            city: propertyData.location?.city || propertyData.city || '',
            state: propertyData.location?.state || propertyData.state || '',
        };
        
        // Add coordinates if present
        if (propertyData.location?.coordinates || (propertyData.latitude && propertyData.longitude)) {
            location.coordinates = {
                lat: propertyData.location?.coordinates?.lat || propertyData.latitude || 0,
                lng: propertyData.location?.coordinates?.lng || propertyData.longitude || 0,
            };
        }
        
        console.log('📍 FINAL LOCATION OBJECT:', location);
        
        // ✅ Calculate area
        const squareFeet = propertyData.area?.value || propertyData.squareFeet || 0;
        const areaDisplay = propertyData.area?.display || `${squareFeet} sqft`;
        
        const area = {
            value: parseInt(squareFeet),
            unit: 'sqft',
            display: areaDisplay,
        };
        
        // ✅ Create property with correct schema
        const property = new Property({
            realtorId: userId,
            title: propertyData.title || '',
            description: propertyData.description || '',
            type: propertyData.type || 'For Sale',
            propertyType: propertyData.propertyType || 'House',
            price: propertyData.price || 0,
            priceDisplay: propertyData.priceDisplay || '$0',
            location: location,  // ✅ Use the location object we built
            bedrooms: propertyData.bedrooms || 0,
            bathrooms: propertyData.bathrooms || 0,
            area: area,
            parking: propertyData.parking || 0,
            features: features,
            imageUrl: imageUrl,
            images: allImages,
            builderName: propertyData.builderName || '',
            floodRisk: propertyData.floodRisk || '',
            floodFactor: propertyData.floodFactor || 0,
            principalInterest: propertyData.principalInterest || 0,
            propertyTax: propertyData.propertyTax || 0,
            homeInsurance: propertyData.homeInsurance || 0,
            hoaFees: propertyData.hoaFees || 0,
            yearBuilt: propertyData.yearBuilt || 0,
            stories: propertyData.stories || 'Single',
            garageSpaces: propertyData.garageSpaces || 0,
            lotSize: propertyData.lotSize || 0,
            amenities: propertyData.amenities || {},
            isNew: true,
            status: 'available'
        });
        
        await property.save();
        
        console.log('========== ADD PROPERTY SUCCESS ==========');
        console.log(`✅ Property saved with location.city: ${location.city}`);
        
        res.status(201).json({
            success: true,
            message: 'Property added successfully',
            data: property
        });
    } catch (error) {
        console.error('\n❌ ADD PROPERTY ERROR:', error);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}   

async getMyProperties(req, res) {
    console.log('\n========== GET MY PROPERTIES START ==========');
    
    try {
        // ✅ FIX 1: Get userId correctly from token
        const userId = req.user.userId;
        console.log(`📝 User ID: ${userId}`);
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);
        
        // ✅ FIX 2: Use 'realtorId' as field name
        const query = { realtorId: userId };
        
        // ✅ FIX 3: Use 'type' instead of 'listingType'
        if (req.query.listingType && req.query.listingType !== 'All') {
            query.type = req.query.listingType;
            console.log(`🔍 Filter by type: ${req.query.listingType}`);
        }
        
        if (req.query.propertyType) {
            query.propertyType = req.query.propertyType;
            console.log(`🔍 Filter by propertyType: ${req.query.propertyType}`);
        }
        
        // ✅ FIX 4: Use nested field 'location.city'
        if (req.query.city) {
            query['location.city'] = req.query.city;
            console.log(`🔍 Filter by city: ${req.query.city}`);
        }
        
        if (req.query.status) {
            query.status = req.query.status;
            console.log(`🔍 Filter by status: ${req.query.status}`);
        }
        
        console.log(`📊 Query:`, JSON.stringify(query, null, 2));
        
        const total = await Property.countDocuments(query);
        console.log(`📈 Total properties: ${total}`);
        
        const properties = await Property.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        console.log(`📋 Retrieved ${properties.length} properties`);
        
        // ✅ Format response for frontend
        const formattedProperties = properties.map(prop => ({
            _id: prop._id,
            title: prop.title,
            propertyTitle: prop.title,
            type: prop.type,
            listingType: prop.type,
            priceDisplay: prop.priceDisplay,
            price: prop.price,
            location: `${prop.location.city}, ${prop.location.state}`,
            city: prop.location.city,
            state: prop.location.state,
            address: prop.location.address,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            squareFeet: prop.area.value,
            area: prop.area.display,
            parking: prop.parking,
            garageSpaces: prop.parking,
            imageUrl: prop.imageUrl,
            mainImage: prop.imageUrl,
            images: prop.images,
            status: prop.status || 'Active',
            isNew: prop.isNew,
            createdAt: prop.createdAt,
            views: prop.views || 0,
            inquiries: prop.inquiries || 0,
            features: prop.features,
            amenities: prop.amenities
        }));
        
        const pagination = {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            itemsPerPage: limit,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        };
        
        console.log(`📄 Pagination info:`, pagination);
        console.log('========== GET MY PROPERTIES SUCCESS ==========\n');
        
        res.status(200).json({
            success: true,
            data: {
                properties: formattedProperties,
                pagination
            }
        });
    } catch (error) {
        console.error('\n❌ ========== GET MY PROPERTIES ERROR ==========');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('===============================================\n');
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


    // backend/controllers/property.controller.js
// Update getPropertyById method
async getPropertyById(req, res) {
    console.log('\n========== GET PROPERTY BY ID START ==========');
    
    try {
        const { propertyId } = req.params;
        const userId = req.user?.userId;
        
        console.log(`🔍 Property ID: ${propertyId}`);
        console.log(`📝 User ID: ${userId || 'No auth (public)'}`);
        
        let query = { _id: propertyId };
        if (userId) {
            query = { _id: propertyId, userId };
        }
        
        const property = await Property.findOne(query).populate('realtorId', 'name email');
        
        if (!property) {
            console.log(`❌ Property not found: ${propertyId}`);
            return res.status(404).json({
                success: false,
                message: 'Property not found'
            });
        }
        
        console.log(`✅ Property found: ${property.title}`);
        
        // ✅ Process amenities
        let amenitiesData = [];
        
        if (property.amenities) {
            if (Array.isArray(property.amenities)) {
                // If amenities is an array of strings
                amenitiesData = property.amenities;
            } else if (typeof property.amenities === 'object') {
                // If amenities is an object/map
                amenitiesData = property.amenities;
            }
        }
        
        res.status(200).json({
            success: true,
            data: {
                _id: property._id,
                title: property.title,
                description: property.description,
                type: property.type,
                propertyType: property.propertyType,
                price: property.price,
                priceDisplay: property.priceDisplay,
                location: property.location,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms,
                area: property.area,
                parking: property.parking,
                features: property.features || [],
                imageUrl: property.imageUrl,
                images: property.images || [],
                bedroomImages: property.bedroomImages || [],
                bathroomImages: property.bathroomImages || [],
                kitchenImages: property.kitchenImages || [],
                livingImages: property.livingImages || [],
                exteriorImages: property.exteriorImages || [],
                
                // ✅ Builder name from realtor
                builderName: property.builderName || property.realtorId?.name || 'Property Owner',
                
                // ✅ Amenities (NEW)
                amenities: amenitiesData,
                
                // Property Details
                yearBuilt: property.yearBuilt,
                stories: property.stories,
                garageSpaces: property.garageSpaces,
                lotSize: property.lotSize,
                
                // Neighborhood
                floodRisk: property.floodRisk,
                floodFactor: property.floodFactor,
                
                // Monthly Costs
                principalInterest: property.principalInterest,
                propertyTax: property.propertyTax,
                homeInsurance: property.homeInsurance,
                hoaFees: property.hoaFees,
                
                // Other
                veteransBenefits: property.veteransBenefits,
                isNew: property.isNew,
                isFeatured: property.isFeatured,
                status: property.status,
                createdAt: property.createdAt,
                updatedAt: property.updatedAt
            }
        });
    } catch (error) {
        console.error('\n❌ ========== GET PROPERTY BY ID ERROR ==========');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('================================================\n');
        
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}    // ==================== UPDATE PROPERTY ====================
    
    async updateProperty(req, res) {
        console.log('\n========== UPDATE PROPERTY START ==========');
        
        try {
            const { propertyId } = req.params;
            const userId = req.user.userId;
            
            console.log(`🔍 Property ID: ${propertyId}`);
            console.log(`📝 User ID: ${userId}`);
            
            const existingProperty = await Property.findOne({ _id: propertyId, userId });
            if (!existingProperty) {
                console.log(`❌ Property not found: ${propertyId}`);
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }
            
            console.log(`✅ Existing property found: ${existingProperty.propertyTitle}`);
            
            // Parse update data
            let updateData;
            if (typeof req.body.propertyData === 'string') {
                console.log('📄 Parsing updateData from JSON string...');
                updateData = JSON.parse(req.body.propertyData);
            } else {
                updateData = req.body;
            }
            
            // Get uploaded files
            const files = req.files || [];
            console.log(`📸 New files received: ${files.length}`);
            
            // Handle Main Image
            const newMainImage = files.find(f => f.fieldname === 'mainImage');
            if (newMainImage) {
                console.log(`🖼️ New main image received: ${newMainImage.originalname}`);
                if (existingProperty.mainImage) {
                    console.log(`🗑️ Deleting old main image...`);
                    await this.deleteImage(existingProperty.mainImage);
                }
                updateData.mainImage = newMainImage.path;
            }
            
            // Handle Bedroom Images
            const newBedroomImages = files.filter(f => f.fieldname === 'bedroomImages');
            if (newBedroomImages.length > 0) {
                console.log(`🖼️ New bedroom images: ${newBedroomImages.length}`);
                await this.deleteImages(existingProperty.bedroomImages);
                updateData.bedroomImages = newBedroomImages.map(f => f.path);
            }
            
            // Handle Bathroom Images
            const newBathroomImages = files.filter(f => f.fieldname === 'bathroomImages');
            if (newBathroomImages.length > 0) {
                console.log(`🖼️ New bathroom images: ${newBathroomImages.length}`);
                await this.deleteImages(existingProperty.bathroomImages);
                updateData.bathroomImages = newBathroomImages.map(f => f.path);
            }
            
            // Handle Kitchen Images
            const newKitchenImages = files.filter(f => f.fieldname === 'kitchenImages');
            if (newKitchenImages.length > 0) {
                console.log(`🖼️ New kitchen images: ${newKitchenImages.length}`);
                await this.deleteImages(existingProperty.kitchenImages);
                updateData.kitchenImages = newKitchenImages.map(f => f.path);
            }
            
            // Handle Living Images
            const newLivingImages = files.filter(f => f.fieldname === 'livingImages');
            if (newLivingImages.length > 0) {
                console.log(`🖼️ New living images: ${newLivingImages.length}`);
                await this.deleteImages(existingProperty.livingImages);
                updateData.livingImages = newLivingImages.map(f => f.path);
            }
            
            // Handle Exterior Images
            const newExteriorImages = files.filter(f => f.fieldname === 'exteriorImages');
            if (newExteriorImages.length > 0) {
                console.log(`🖼️ New exterior images: ${newExteriorImages.length}`);
                await this.deleteImages(existingProperty.exteriorImages);
                updateData.exteriorImages = newExteriorImages.map(f => f.path);
            }
            
            // Parse JSON fields
            if (updateData.features && typeof updateData.features === 'string') {
                updateData.features = JSON.parse(updateData.features);
            }
            if (updateData.commercialFeatures && typeof updateData.commercialFeatures === 'string') {
                updateData.commercialFeatures = JSON.parse(updateData.commercialFeatures);
            }
            
            if (updateData.veteransBenefits !== undefined) {
                updateData.veteransBenefits = updateData.veteransBenefits === 'true' || updateData.veteransBenefits === true;
            }
            
            console.log('💾 Updating property in database...');
            const updatedProperty = await Property.findByIdAndUpdate(
                propertyId,
                { ...updateData },
                { new: true, runValidators: true }
            );
            
            console.log(`✅ Property updated successfully: ${updatedProperty.propertyTitle}`);
            console.log('========== UPDATE PROPERTY SUCCESS ==========\n');
            
            res.status(200).json({
                success: true,
                message: 'Property updated successfully',
                data: updatedProperty
            });
        } catch (error) {
            console.error('\n❌ ========== UPDATE PROPERTY ERROR ==========');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('=============================================\n');
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    
    async deleteProperty(req, res) {
        console.log('\n========== DELETE PROPERTY START ==========');
        
        try {
            const { propertyId } = req.params;
            const userId = req.user.userId;
            
            console.log(`🔍 Property ID: ${propertyId}`);
            console.log(`📝 User ID: ${userId}`);
            
            const property = await Property.findOne({ _id: propertyId, userId });
            if (!property) {
                console.log(`❌ Property not found: ${propertyId}`);
                return res.status(404).json({
                    success: false,
                    message: 'Property not found'
                });
            }
            
            console.log(`✅ Property found: ${property.propertyTitle}`);
            console.log(`🗑️ Deleting all images from Cloudinary...`);
            
            // Delete all images from Cloudinary
            if (property.mainImage) await this.deleteImage(property.mainImage);
            await this.deleteImages(property.bedroomImages);
            await this.deleteImages(property.bathroomImages);
            await this.deleteImages(property.kitchenImages);
            await this.deleteImages(property.livingImages);
            await this.deleteImages(property.exteriorImages);
            
            console.log(`💾 Deleting property from database...`);
            await Property.findByIdAndDelete(propertyId);
            
            console.log(`✅ Property deleted successfully: ${property.propertyTitle}`);
            console.log('========== DELETE PROPERTY SUCCESS ==========\n');
            
            res.status(200).json({
                success: true,
                message: 'Property deleted successfully'
            });
        } catch (error) {
            console.error('\n❌ ========== DELETE PROPERTY ERROR ==========');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('=============================================\n');
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // ==================== GET ALL PROPERTIES (PUBLIC) ====================
    
    async getAllProperties(req, res) {
        console.log('\n========== GET ALL PROPERTIES START ==========');
        
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const skip = (page - 1) * limit;
            
            console.log(`📄 Pagination: page=${page}, limit=${limit}, skip=${skip}`);
            
            const query = { isActive: true };
            
            // Apply filters
            if (req.query.listingType) {
                query.listingType = req.query.listingType;
                console.log(`🔍 Filter by listingType: ${req.query.listingType}`);
            }
            if (req.query.propertyType) {
                query.propertyType = req.query.propertyType;
                console.log(`🔍 Filter by propertyType: ${req.query.propertyType}`);
            }
            if (req.query.city) {
                query.city = req.query.city;
                console.log(`🔍 Filter by city: ${req.query.city}`);
            }
            
            // Price filter
            if (req.query.minPrice || req.query.maxPrice) {
                query.$or = [
                    { salePrice: {} },
                    { rentMinPrice: {} },
                    { commercialPrice: {} }
                ];
                if (req.query.minPrice) {
                    const minPrice = parseInt(req.query.minPrice);
                    query.$or.forEach(q => {
                        if (q.salePrice) q.salePrice.$gte = minPrice;
                        if (q.rentMinPrice) q.rentMinPrice.$gte = minPrice;
                        if (q.commercialPrice) q.commercialPrice.$gte = minPrice;
                    });
                    console.log(`🔍 Min Price: ${minPrice}`);
                }
                if (req.query.maxPrice) {
                    const maxPrice = parseInt(req.query.maxPrice);
                    query.$or.forEach(q => {
                        if (q.salePrice) q.salePrice.$lte = maxPrice;
                        if (q.rentMaxPrice) q.rentMaxPrice.$lte = maxPrice;
                        if (q.commercialPrice) q.commercialPrice.$lte = maxPrice;
                    });
                    console.log(`🔍 Max Price: ${maxPrice}`);
                }
            }
            
            if (req.query.bedrooms && req.query.bedrooms !== 'No min') {
                query.bedrooms = req.query.bedrooms;
                console.log(`🔍 Bedrooms: ${req.query.bedrooms}`);
            }
            if (req.query.bathrooms && req.query.bathrooms !== 'No min') {
                query.bathrooms = req.query.bathrooms;
                console.log(`🔍 Bathrooms: ${req.query.bathrooms}`);
            }
            
            // Search
            if (req.query.search) {
                query.$or = [
                    { propertyTitle: { $regex: req.query.search, $options: 'i' } },
                    { address: { $regex: req.query.search, $options: 'i' } },
                    { city: { $regex: req.query.search, $options: 'i' } }
                ];
                console.log(`🔍 Search: ${req.query.search}`);
            }
            
            console.log(`📊 Query:`, JSON.stringify(query, null, 2));
            
            const total = await Property.countDocuments(query);
            console.log(`📈 Total properties: ${total}`);
            
            const properties = await Property.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            
            console.log(`📋 Retrieved ${properties.length} properties`);
            
            const pagination = {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            };
            
            console.log('========== GET ALL PROPERTIES SUCCESS ==========\n');
            
            res.status(200).json({
                success: true,
                data: {
                    properties,
                    pagination
                }
            });
        } catch (error) {
            console.error('\n❌ ========== GET ALL PROPERTIES ERROR ==========');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('================================================\n');
            
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

async getPropertiesByCity(req, res) {
    try {
        const { city } = req.params;
        const { 
            type, 
            minPrice, 
            maxPrice, 
            minBedrooms, 
            maxBedrooms,
            minBathrooms,
            maxBathrooms,
            minArea,
            maxArea,
            propertyTypes,
            sortBy = 'newest',
            limit = 20
        } = req.query;
        
        // Build query
        let query = { 'location.city': { $regex: new RegExp(city, 'i') } };
        
        // Filter by property type
        if (type && type !== 'All') {
            query.type = type;
        }
        
        // Filter by price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice && minPrice !== 'No min') {
                query.price.$gte = parseInt(minPrice);
            }
            if (maxPrice && maxPrice !== 'No max') {
                query.price.$lte = parseInt(maxPrice);
            }
        }
        
        // Filter by bedrooms
        if (minBedrooms && minBedrooms !== 'No min' && minBedrooms !== 'Studio') {
            query.bedrooms = {};
            if (minBedrooms !== 'No min') {
                query.bedrooms.$gte = parseInt(minBedrooms);
            }
            if (maxBedrooms && maxBedrooms !== 'No max') {
                query.bedrooms.$lte = parseInt(maxBedrooms);
            }
        }
        
        // Filter by bathrooms
        if (minBathrooms && minBathrooms !== 'No min') {
            query.bathrooms = {};
            if (minBathrooms !== 'No min') {
                query.bathrooms.$gte = parseInt(minBathrooms);
            }
            if (maxBathrooms && maxBathrooms !== 'No max') {
                query.bathrooms.$lte = parseInt(maxBathrooms);
            }
        }
        
        // Filter by area
        if (minArea && minArea !== 'No min') {
            query['area.value'] = {};
            const minAreaValue = parseInt(minArea.replace(' sqft', '').replace('+', ''));
            if (minArea !== 'No min') {
                query['area.value'].$gte = minAreaValue;
            }
            if (maxArea && maxArea !== 'No max') {
                const maxAreaValue = parseInt(maxArea.replace(' sqft', '').replace('+', ''));
                query['area.value'].$lte = maxAreaValue;
            }
        }
        
        // Filter by property types
        if (propertyTypes && propertyTypes.length > 0) {
            const types = propertyTypes.split(',');
            query.propertyType = { $in: types };
        }
        
        // Sorting
        let sort = {};
        switch (sortBy) {
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'Lowest Price':
                sort = { price: 1 };
                break;
            case 'Highest Price':
                sort = { price: -1 };
                break;
            case 'Most Popular':
                sort = { isFeatured: -1, createdAt: -1 };
                break;
            default:
                sort = { createdAt: -1 };
        }
        
        const properties = await Property.find(query)
            .sort(sort)
            .limit(parseInt(limit));


        const formattedProperties = properties.map(prop => ({
            id: prop._id,
            title: prop.title,
            imageUrl: prop.imageUrl,
            price: prop.priceDisplay,
            priceValue: prop.price,
            type: prop.type,
            location: `${prop.location.city}, ${prop.location.state}`,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            area: prop.area.display,
            parking: prop.parking,
            isNew: prop.isNew,
            timeAgo: getTimeAgo(prop.createdAt), 
            isFavorite: false,
            propertyType: prop.propertyType
        }));
        
        res.status(200).json({
            success: true,
            count: formattedProperties.length,
            data: formattedProperties
        });
        
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}



async searchProperties(req, res) {
    try {
        const {
            query,           // Search term (city, country, address, title)
            type,           // For Sale, For Rent, Commercial
            minPrice,
            maxPrice,
            minBedrooms,
            maxBedrooms,
            minBathrooms,
            maxBathrooms,
            minArea,
            maxArea,
            propertyTypes,   // House, Condo, etc.
            sortBy = 'newest',
            page = 1,
            limit = 20
        } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build search query
        let searchQuery = { status: 'available' };
        
        // ==================== TEXT SEARCH (CASE INSENSITIVE) ====================
        if (query && query.trim().length > 0) {
            const searchTerm = query.trim();
            // Create regex for case-insensitive search
            const regex = new RegExp(searchTerm, 'i');
            
            // Search in multiple fields
            searchQuery.$or = [
                { title: regex },                    // Property title
                { 'location.city': regex },          // City name
                { 'location.state': regex },         // State name
                { 'location.address': regex },       // Address
                { 'location.country': regex },       // Country (if you have)
                { description: regex }               // Description
            ];
        }
        
        // ==================== TYPE FILTER ====================
        if (type && type !== 'All') {
            searchQuery.type = type;
        }
        
        // ==================== PRICE FILTER ====================
        if (minPrice || maxPrice) {
            searchQuery.price = {};
            if (minPrice && minPrice !== 'No min') {
                searchQuery.price.$gte = parseInt(minPrice);
            }
            if (maxPrice && maxPrice !== 'No max') {
                searchQuery.price.$lte = parseInt(maxPrice);
            }
        }
        
        // ==================== BEDROOMS FILTER ====================
        if (minBedrooms && minBedrooms !== 'No min' && minBedrooms !== 'Studio') {
            searchQuery.bedrooms = {};
            if (minBedrooms !== 'No min') {
                searchQuery.bedrooms.$gte = parseInt(minBedrooms);
            }
            if (maxBedrooms && maxBedrooms !== 'No max') {
                searchQuery.bedrooms.$lte = parseInt(maxBedrooms);
            }
        }
        
        // ==================== BATHROOMS FILTER ====================
        if (minBathrooms && minBathrooms !== 'No min') {
            searchQuery.bathrooms = {};
            if (minBathrooms !== 'No min') {
                searchQuery.bathrooms.$gte = parseInt(minBathrooms);
            }
            if (maxBathrooms && maxBathrooms !== 'No max') {
                searchQuery.bathrooms.$lte = parseInt(maxBathrooms);
            }
        }
        
        // ==================== AREA FILTER ====================
        if (minArea && minArea !== 'No min') {
            searchQuery['area.value'] = {};
            const minAreaValue = parseInt(minArea.replace(' sqft', '').replace('+', ''));
            if (!isNaN(minAreaValue)) {
                searchQuery['area.value'].$gte = minAreaValue;
            }
            if (maxArea && maxArea !== 'No max') {
                const maxAreaValue = parseInt(maxArea.replace(' sqft', '').replace('+', ''));
                if (!isNaN(maxAreaValue)) {
                    searchQuery['area.value'].$lte = maxAreaValue;
                }
            }
        }
        
        // ==================== PROPERTY TYPE FILTER ====================
        if (propertyTypes && propertyTypes.length > 0) {
            const types = propertyTypes.split(',');
            searchQuery.propertyType = { $in: types };
        }
        
        // ==================== SORTING ====================
        let sort = {};
        switch (sortBy) {
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'price_low':
                sort = { price: 1 };
                break;
            case 'price_high':
                sort = { price: -1 };
                break;
            case 'popular':
                sort = { views: -1, createdAt: -1 };
                break;
            default:
                sort = { createdAt: -1 };
        }
        
        console.log('🔍 SEARCH QUERY:', JSON.stringify(searchQuery, null, 2));
        
        // Get total count
        const total = await Property.countDocuments(searchQuery);
        
        // Get properties with pagination
        const properties = await Property.find(searchQuery)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));
        
        // Format response
        const formattedProperties = properties.map(prop => ({
            id: prop._id,
            title: prop.title,
            imageUrl: prop.imageUrl,
            price: prop.priceDisplay,
            priceValue: prop.price,
            type: prop.type,
            location: `${prop.location.city}, ${prop.location.state}`,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            area: prop.area.display,
            parking: prop.parking,
            isNew: prop.isNew,
            timeAgo: getTimeAgo(prop.createdAt),
            isFavorite: false,
            propertyType: prop.propertyType,
            views: prop.views || 0
        }));
        
        res.status(200).json({
            success: true,
            data: {
                properties: formattedProperties,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNext: skip + parseInt(limit) < total,
                    hasPrev: parseInt(page) > 1
                }
            }
        });
        
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
}
module.exports = new PropertyController();