const express = require('express');
const router = express.Router();
const Product = require('../model/product');
const multer = require('multer');
const { uploadProduct } = require('../uploadFile');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all products - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const products = await Product.find(filter)
            .populate('proCategoryId', 'id name')
            .populate('proSubCategoryId', 'id name')
            .populate('proBrandId', 'id name')
            .populate('proVariantTypeId', 'id type')
            .populate('proVariantId', 'id name')
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
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

// Create new product - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        uploadProduct.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 },
            { name: 'image3', maxCount: 1 },
            { name: 'image4', maxCount: 1 },
            { name: 'image5', maxCount: 1 }
        ])(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
            } else if (err) {
                return res.status(500).json({ success: false, message: `Upload failed: ${err.message}` });
            }

            try {
                const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId, adminId } = req.body;

                if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
                    return res.status(400).json({ success: false, message: "Name, quantity, price, category, and subcategory are required." });
                }

                // Process images
                const imageUrls = [];
                const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
                fields.forEach((field, index) => {
                    if (req.files[field] && req.files[field].length > 0) {
                        const file = req.files[field][0];
                        imageUrls.push({ image: index + 1, url: file.path });
                    }
                });

                if (imageUrls.length === 0) {
                    return res.status(400).json({ success: false, message: "At least one product image is required." });
                }
                
                const newProduct = new Product({ 
                    name, description, 
                    quantity: parseInt(quantity),
                    price: parseFloat(price),
                    offerPrice: offerPrice ? parseFloat(offerPrice) : undefined,
                    proCategoryId, proSubCategoryId, proBrandId,
                    proVariantTypeId, 
                    proVariantId: proVariantId ? (Array.isArray(proVariantId) ? proVariantId : [proVariantId]) : [],
                    createdBy: adminId,
                    images: imageUrls 
                });

                await newProduct.save();
                res.json({ success: true, message: "Product created successfully.", data: newProduct });

            } catch (dbError) {
                res.status(500).json({ success: false, message: `Database error: ${dbError.message}` });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a product - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
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
                return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
            } else if (err) {
                return res.status(500).json({ success: false, message: `Upload failed: ${err.message}` });
            }

            try {
                const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId, adminId } = req.body;

                // Find product and check ownership
                const product = await Product.findById(productId);
                if (!product) {
                    return res.status(404).json({ success: false, message: "Product not found." });
                }

                // Super admin can edit anything, regular admins only their own
                if (req.admin.clearanceLevel !== 'super_admin' && product.createdBy.toString() !== adminId) {
                    return res.status(403).json({ success: false, message: "You can only edit your own products." });
                }

                // Update fields
                if (name) product.name = name;
                if (description) product.description = description;
                if (quantity) product.quantity = parseInt(quantity);
                if (price) product.price = parseFloat(price);
                if (offerPrice) product.offerPrice = parseFloat(offerPrice);
                if (proCategoryId) product.proCategoryId = proCategoryId;
                if (proSubCategoryId) product.proSubCategoryId = proSubCategoryId;
                if (proBrandId) product.proBrandId = proBrandId;
                if (proVariantTypeId) product.proVariantTypeId = proVariantTypeId;
                if (proVariantId) product.proVariantId = Array.isArray(proVariantId) ? proVariantId : [proVariantId];

                // Update images if new ones uploaded
                const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
                fields.forEach((field, index) => {
                    if (req.files[field] && req.files[field].length > 0) {
                        const file = req.files[field][0];
                        const imageUrl = file.path;
                        
                        let imageEntry = product.images.find(img => img.image === (index + 1));
                        if (imageEntry) {
                            imageEntry.url = imageUrl;
                        } else {
                            product.images.push({ image: index + 1, url: imageUrl });
                        }
                    }
                });

                await product.save();
                res.json({ success: true, message: "Product updated successfully.", data: product });
            } catch (dbError) {
                res.status(500).json({ success: false, message: `Database error: ${dbError.message}` });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a product - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const productID = req.params.id;
    const { adminId } = req.body;
    
    try {
        const product = await Product.findById(productID);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && product.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own products." });
        }

        await Product.findByIdAndDelete(productID);
        res.json({ success: true, message: "Product deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;