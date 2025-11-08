const express = require('express');
const router = express.Router();
const Brand = require('../model/brand');
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all brands - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const brands = await Brand.find(filter)
            .populate('subcategoryId')
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        
        res.json({ success: true, message: "Brands retrieved successfully.", data: brands });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a brand by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const brandID = req.params.id;
        const brand = await Brand.findById(brandID)
            .populate('subcategoryId')
            .populate('createdBy', 'username name');
        
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found." });
        }
        res.json({ success: true, message: "Brand retrieved successfully.", data: brand });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new brand - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    const { name, subcategoryId, adminId } = req.body;
    
    if (!name || !subcategoryId) {
        return res.status(400).json({ success: false, message: "Name and subcategory ID are required." });
    }

    try {
        const brand = new Brand({ name, subcategoryId, createdBy: adminId });
        const newBrand = await brand.save();
        res.json({ success: true, message: "Brand created successfully.", data: newBrand });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a brand - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const brandID = req.params.id;
    const { name, subcategoryId, adminId } = req.body;
    
    if (!name || !subcategoryId) {
        return res.status(400).json({ success: false, message: "Name and subcategory ID are required." });
    }

    try {
        // Find brand and check ownership
        const brand = await Brand.findById(brandID);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found." });
        }

        // Super admin can edit anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && brand.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only edit your own brands." });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            brandID, 
            { name, subcategoryId }, 
            { new: true }
        );
        
        res.json({ success: true, message: "Brand updated successfully.", data: updatedBrand });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a brand - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const brandID = req.params.id;
    const { adminId } = req.body;
    
    try {
        // Find brand and check ownership
        const brand = await Brand.findById(brandID);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && brand.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own brands." });
        }

        // Check if any products reference this brand
        const products = await Product.find({ proBrandId: brandID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete brand. Products are referencing it." });
        }

        await Brand.findByIdAndDelete(brandID);
        res.json({ success: true, message: "Brand deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;