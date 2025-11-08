const express = require('express');
const router = express.Router();
const Variant = require('../model/variant');
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all variants - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const variants = await Variant.find(filter)
            .populate('variantTypeId')
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        
        res.json({ success: true, message: "Variants retrieved successfully.", data: variants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a variant by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const variantID = req.params.id;
        const variant = await Variant.findById(variantID)
            .populate('variantTypeId')
            .populate('createdBy', 'username name');
            
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }
        res.json({ success: true, message: "Variant retrieved successfully.", data: variant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new variant - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    const { name, variantTypeId, adminId } = req.body;
    
    if (!name || !variantTypeId) {
        return res.status(400).json({ success: false, message: "Name and VariantType ID are required." });
    }

    try {
        const variant = new Variant({ name, variantTypeId, createdBy: adminId });
        const newVariant = await variant.save();
        res.json({ success: true, message: "Variant created successfully.", data: newVariant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a variant - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const variantID = req.params.id;
    const { name, variantTypeId, adminId } = req.body;
    
    if (!name || !variantTypeId) {
        return res.status(400).json({ success: false, message: "Name and VariantType ID are required." });
    }

    try {
        // Find variant and check ownership
        const variant = await Variant.findById(variantID);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }

        // Super admin can edit anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && variant.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only edit your own variants." });
        }

        const updatedVariant = await Variant.findByIdAndUpdate(
            variantID, 
            { name, variantTypeId }, 
            { new: true }
        );
        
        res.json({ success: true, message: "Variant updated successfully.", data: updatedVariant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a variant - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const variantID = req.params.id;
    const { adminId } = req.body;
    
    try {
        // Find variant and check ownership
        const variant = await Variant.findById(variantID);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && variant.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own variants." });
        }

        // Check if any products reference this variant
        const products = await Product.find({ proVariantId: variantID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete variant. Products are referencing it." });
        }

        await Variant.findByIdAndDelete(variantID);
        res.json({ success: true, message: "Variant deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;