const express = require('express');
const router = express.Router();
const Product = require('../model/product');
const multer = require('multer');
const { uploadProduct } = require('../uploadFile');
const asyncHandler = require('express-async-handler');

// Get all products
router.get('/', asyncHandler(async (req, res) => {
    try {
        const products = await Product.find()
        .populate('proCategoryId', 'id name')
        .populate('proSubCategoryId', 'id name')
        .populate('proBrandId', 'id name')
        .populate('proVariantTypeId', 'id type')
        .populate('proVariantId', 'id name')
        .populate('createdBy', 'username name');
        res.json({ success: true, message: "Products retrieved successfully.", data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a product by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const productID = req.params.id;
        const product = await Product.findById(productID)
            .populate('proCategoryId', 'id name')
            .populate('proSubCategoryId', 'id name')
            .populate('proBrandId', 'id name')
            .populate('proVariantTypeId', 'id name')
            .populate('proVariantId', 'id name')
            .populate('createdBy', 'username name');
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, message: "Product retrieved successfully.", data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create new product with Cloudinary
router.post('/', asyncHandler(async (req, res) => {
    try {
        uploadProduct.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 }
        ])(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'File size is too large. Maximum filesize is 5MB per image.' 
                    });
                }
                return res.status(400).json({ 
                    success: false, 
                    message: `File upload error: ${err.message}` 
                });
            } else if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: `Upload failed: ${err.message}` 
                });
            }

            try {
                const {
                    name,
                    description,
                    quantity,
                    price, 
                    offerPrice, 
                    proCategoryId, 
                    proSubCategoryId, 
                    proBrandId, 
                    proVariantTypeId, 
                    proVariantId, 
                    createdBy 
                } = req.body;

                // Validate required fields
                if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Name, quantity, price, category, and subcategory are required." 
                    });
                }

                // Initialize an array to store image URLs
                const imageUrls = [];

                // Iterate over the file fields
                const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
                fields.forEach((field, index) => {
                    if (req.files[field] && req.files[field].length > 0) {
                        const file = req.files[field][0];
                        const imageUrl = file.path;
                        imageUrls.push({ image: index + 1, url: imageUrl });
                    }
                });

                // Check if at least one image is provided
                if (imageUrls.length === 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "At least one product image is required." 
                    });
                }
                
                // Create a new product object with data
                const newProduct = new Product({ 
                    name, 
                    description, 
                    quantity: parseInt(quantity),
                    price: parseFloat(price),
                    offerPrice: offerPrice ? parseFloat(offerPrice) : undefined,
                    proCategoryId, 
                    proSubCategoryId, 
                    proBrandId,
                    proVariantTypeId, 
                    proVariantId: proVariantId ? (Array.isArray(proVariantId) ? proVariantId : [proVariantId]) : [],
                    createdBy,
                    images: imageUrls 
                });

                await newProduct.save();

                res.json({ 
                    success: true, 
                    message: "Product created successfully.", 
                    data: newProduct 
                });

            } catch (dbError) {
                res.status(500).json({ 
                    success: false, 
                    message: `Database error: ${dbError.message}` 
                });
            }
        });

    } catch (outerError) {
        res.status(500).json({ 
            success: false, 
            message: `Server error: ${outerError.message}` 
        });
    }
}));

// Update a product with Cloudinary
router.put('/:id', asyncHandler(async (req, res) => {
    const productId = req.params.id;
    try {
        uploadProduct.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 }
        ])(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'File size is too large. Maximum filesize is 5MB per image.' 
                    });
                }
                return res.status(400).json({ 
                    success: false, 
                    message: `File upload error: ${err.message}` 
                });
            } else if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: `Upload failed: ${err.message}` 
                });
            }

            try {
                const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

                // Find the product by ID
                const productToUpdate = await Product.findById(productId);
                if (!productToUpdate) {
                    return res.status(404).json({ success: false, message: "Product not found." });
                }

                // Update product properties if provided
                if (name) productToUpdate.name = name;
                if (description) productToUpdate.description = description;
                if (quantity) productToUpdate.quantity = parseInt(quantity);
                if (price) productToUpdate.price = parseFloat(price);
                if (offerPrice) productToUpdate.offerPrice = parseFloat(offerPrice);
                if (proCategoryId) productToUpdate.proCategoryId = proCategoryId;
                if (proSubCategoryId) productToUpdate.proSubCategoryId = proSubCategoryId;
                if (proBrandId) productToUpdate.proBrandId = proBrandId;
                if (proVariantTypeId) productToUpdate.proVariantTypeId = proVariantTypeId;
                if (proVariantId) productToUpdate.proVariantId = Array.isArray(proVariantId) ? proVariantId : [proVariantId];

                // Iterate over the file fields to update images
                const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
                fields.forEach((field, index) => {
                    if (req.files[field] && req.files[field].length > 0) {
                        const file = req.files[field][0];
                        const imageUrl = file.path;
                        
                        let imageEntry = productToUpdate.images.find(img => img.image === (index + 1));
                        if (imageEntry) {
                            imageEntry.url = imageUrl;
                        } else {
                            productToUpdate.images.push({ image: index + 1, url: imageUrl });
                        }
                    }
                });

                await productToUpdate.save();
                
                res.json({ 
                    success: true, 
                    message: "Product updated successfully.", 
                    data: productToUpdate 
                });
            } catch (dbError) {
                res.status(500).json({ 
                    success: false, 
                    message: `Database error: ${dbError.message}` 
                });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a product
router.delete('/:id', asyncHandler(async (req, res) => {
    const productID = req.params.id;
    try {
        const product = await Product.findByIdAndDelete(productID);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, message: "Product deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;