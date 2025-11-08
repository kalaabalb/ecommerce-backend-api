const express = require('express');
const router = express.Router();
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Product = require('../model/product');
const { uploadCategory } = require('../uploadFile');
const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all categories - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const categories = await Category.find(filter)
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a category by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        const category = await Category.findById(categoryID)
            .populate('createdBy', 'username name');
        
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        
        res.json({ success: true, message: "Category retrieved successfully.", data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new category - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        uploadCategory.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.json({ success: false, message: err.message });
            } else if (err) {
                return res.json({ success: false, message: err.message });
            }
            
            const { name, adminId } = req.body;
            let imageUrl = '';

            if (req.file) {
                imageUrl = req.file.path;
            }

            if (!name) {
                return res.status(400).json({ success: false, message: "Name is required." });
            }

            if (!imageUrl) {
                return res.status(400).json({ success: false, message: "Image is required." });
            }

            try {
                const newCategory = new Category({
                    name: name,
                    image: imageUrl,
                    createdBy: adminId
                });
                
                await newCategory.save();
                res.json({ success: true, message: "Category created successfully.", data: newCategory });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Update a category - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        uploadCategory.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.json({ success: false, message: err.message });
            } else if (err) {
                return res.json({ success: false, message: err.message });
            }

            const { name, adminId } = req.body;
            let image = req.body.image;

            if (req.file) {
                image = req.file.path;
            }

            if (!name || !image) {
                return res.status(400).json({ success: false, message: "Name and image are required." });
            }

            try {
                // Find category and check ownership
                const category = await Category.findById(categoryID);
                if (!category) {
                    return res.status(404).json({ success: false, message: "Category not found." });
                }

                // Super admin can edit anything, regular admins only their own
                if (req.admin.clearanceLevel !== 'super_admin' && category.createdBy.toString() !== adminId) {
                    return res.status(403).json({ success: false, message: "You can only edit your own categories." });
                }

                const updatedCategory = await Category.findByIdAndUpdate(
                    categoryID, 
                    { name: name, image: image }, 
                    { new: true }
                );
                
                res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Delete a category - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        const { adminId } = req.body;

        // Find category and check ownership
        const category = await Category.findById(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && category.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own categories." });
        }

        // Check if any subcategories reference this category
        const subcategories = await SubCategory.find({ categoryId: categoryID });
        if (subcategories.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
        }

        // Check if any products reference this category
        const products = await Product.find({ proCategoryId: categoryID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
        }

        await Category.findByIdAndDelete(categoryID);
        res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;