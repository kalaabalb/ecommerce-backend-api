const express = require('express');
const router = express.Router();
const SubCategory = require('../model/subCategory');
const Brand = require('../model/brand');
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all sub-categories - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const subCategories = await SubCategory.find(filter)
            .populate('categoryId')
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        
        res.json({ success: true, message: "Sub-categories retrieved successfully.", data: subCategories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a sub-category by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const subCategoryID = req.params.id;
        const subCategory = await SubCategory.findById(subCategoryID)
            .populate('categoryId')
            .populate('createdBy', 'username name');
            
        if (!subCategory) {
            return res.status(404).json({ success: false, message: "Sub-category not found." });
        }
        res.json({ success: true, message: "Sub-category retrieved successfully.", data: subCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new sub-category - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    const { name, categoryId, adminId } = req.body;
    
    if (!name || !categoryId) {
        return res.status(400).json({ success: false, message: "Name and category ID are required." });
    }

    try {
        const subCategory = new SubCategory({ name, categoryId, createdBy: adminId });
        const newSubCategory = await subCategory.save();
        res.json({ success: true, message: "Sub-category created successfully.", data: newSubCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a sub-category - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const subCategoryID = req.params.id;
    const { name, categoryId, adminId } = req.body;
    
    if (!name || !categoryId) {
        return res.status(400).json({ success: false, message: "Name and category ID are required." });
    }

    try {
        // Find subcategory and check ownership
        const subCategory = await SubCategory.findById(subCategoryID);
        if (!subCategory) {
            return res.status(404).json({ success: false, message: "Sub-category not found." });
        }

        // Super admin can edit anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && subCategory.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only edit your own sub-categories." });
        }

        const updatedSubCategory = await SubCategory.findByIdAndUpdate(
            subCategoryID, 
            { name, categoryId }, 
            { new: true }
        );
        
        res.json({ success: true, message: "Sub-category updated successfully.", data: updatedSubCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a sub-category - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const subCategoryID = req.params.id;
    const { adminId } = req.body;
    
    try {
        // Find subcategory and check ownership
        const subCategory = await SubCategory.findById(subCategoryID);
        if (!subCategory) {
            return res.status(404).json({ success: false, message: "Sub-category not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && subCategory.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own sub-categories." });
        }

        // Check if any brand is associated with the sub-category
        const brandCount = await Brand.countDocuments({ subcategoryId: subCategoryID });
        if (brandCount > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete sub-category. It is associated with one or more brands." });
        }

        // Check if any products reference this sub-category
        const products = await Product.find({ proSubCategoryId: subCategoryID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete sub-category. Products are referencing it." });
        }

        await SubCategory.findByIdAndDelete(subCategoryID);
        res.json({ success: true, message: "Sub-category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;