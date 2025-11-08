const express = require('express');
const router = express.Router();
const VariantType = require('../model/variantType');
const Product = require('../model/product');
const Variant = require('../model/variant');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all variant types - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const variantTypes = await VariantType.find(filter)
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        
        res.json({ success: true, message: "VariantTypes retrieved successfully.", data: variantTypes });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a variant type by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const variantTypeID = req.params.id;
        const variantType = await VariantType.findById(variantTypeID)
            .populate('createdBy', 'username name');
            
        if (!variantType) {
            return res.status(404).json({ success: false, message: "VariantType not found." });
        }
        res.json({ success: true, message: "VariantType retrieved successfully.", data: variantType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new variant type - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    const { name, type, adminId } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: "Name is required." });
    }

    try {
        const variantType = new VariantType({ name, type, createdBy: adminId });
        const newVariantType = await variantType.save();
        res.json({ success: true, message: "VariantType created successfully.", data: newVariantType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a variant type - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;
    const { name, type, adminId } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, message: "Name is required." });
    }

    try {
        // Find variant type and check ownership
        const variantType = await VariantType.findById(variantTypeID);
        if (!variantType) {
            return res.status(404).json({ success: false, message: "VariantType not found." });
        }

        // Super admin can edit anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && variantType.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only edit your own variant types." });
        }

        const updatedVariantType = await VariantType.findByIdAndUpdate(
            variantTypeID, 
            { name, type }, 
            { new: true }
        );
        
        res.json({ success: true, message: "VariantType updated successfully.", data: updatedVariantType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a variant type - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;
    const { adminId } = req.body;
    
    try {
        // Find variant type and check ownership
        const variantType = await VariantType.findById(variantTypeID);
        if (!variantType) {
            return res.status(404).json({ success: false, message: "Variant type not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && variantType.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own variant types." });
        }

        // Check if any variant is associated with this variant type
        const variantCount = await Variant.countDocuments({ variantTypeId: variantTypeID });
        if (variantCount > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete variant type. It is associated with one or more variants." });
        }
        
        // Check if any products reference this variant type
        const products = await Product.find({ proVariantTypeId: variantTypeID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete variant type. Products are referencing it." });
        }

        await VariantType.findByIdAndDelete(variantTypeID);
        res.json({ success: true, message: "Variant type deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;