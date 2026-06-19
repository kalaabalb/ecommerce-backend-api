const express = require("express");
const router = express.Router();
const Category = require("../model/category");
const SubCategory = require("../model/subCategory");
const Product = require("../model/product");
const { uploadCategory } = require("../uploadFile");
const multer = require("multer");
const asyncHandler = require("express-async-handler");
const {
  buildOwnedQuery,
  canAccessOwnedDocument,
  loadAdmin,
  requireAdminAuth,
} = require("../middleware/adminAccess");

// Get all categories
router.get(
  "/",
  loadAdmin,
  asyncHandler(async (req, res) => {
    try {
      const categories = await Category.find(buildOwnedQuery(req, {})).sort({
        _id: -1,
      });
      res.json({
        success: true,
        message: "Categories retrieved successfully.",
        data: categories,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get a category by ID
router.get(
  "/:id",
  loadAdmin,
  asyncHandler(async (req, res) => {
    try {
      const categoryID = req.params.id;
      const category = await Category.findById(categoryID);

      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found." });
      }

      if (!canAccessOwnedDocument(req, category)) {
        return res.status(403).json({
          success: false,
          message: "You can only access categories you created.",
        });
      }

      res.json({
        success: true,
        message: "Category retrieved successfully.",
        data: category,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Create a new category
router.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      uploadCategory.single("img")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.json({ success: false, message: err.message });
        } else if (err) {
          return res.json({ success: false, message: err.message });
        }

        const { name } = req.body;
        let imageUrl = "";

        if (req.file) {
          imageUrl = req.file.path;
        }

        if (!name) {
          return res
            .status(400)
            .json({ success: false, message: "Name is required." });
        }

        if (!imageUrl) {
          return res
            .status(400)
            .json({ success: false, message: "Image is required." });
        }

        try {
          const newCategory = new Category({
            name: name,
            image: imageUrl,
            createdBy: req.adminUser._id,
          });

          await newCategory.save();
          res.json({
            success: true,
            message: "Category created successfully.",
            data: newCategory,
          });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }),
);

// Update a category
router.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const categoryID = req.params.id;
      uploadCategory.single("img")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.json({ success: false, message: err.message });
        } else if (err) {
          return res.json({ success: false, message: err.message });
        }

        const { name } = req.body;
        let image = req.body.image;

        if (req.file) {
          image = req.file.path;
        }

        if (!name || !image) {
          return res
            .status(400)
            .json({ success: false, message: "Name and image are required." });
        }

        try {
          const category = await Category.findById(categoryID);
          if (!category) {
            return res
              .status(404)
              .json({ success: false, message: "Category not found." });
          }

          if (!canAccessOwnedDocument(req, category)) {
            return res.status(403).json({
              success: false,
              message: "You can only edit categories you created.",
            });
          }

          const updatedCategory = await Category.findByIdAndUpdate(
            categoryID,
            {
              name: name,
              image: image,
              createdBy: category.createdBy || req.adminUser._id,
            },
            { new: true },
          );

          res.json({
            success: true,
            message: "Category updated successfully.",
            data: updatedCategory,
          });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }),
);

// Delete a category
router.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const categoryID = req.params.id;

      const category = await Category.findById(categoryID);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found." });
      }

      if (!canAccessOwnedDocument(req, category)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete categories you created.",
        });
      }

      // Check if any subcategories reference this category
      const subcategories = await SubCategory.find({ categoryId: categoryID });
      if (subcategories.length > 0) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Cannot delete category. Subcategories are referencing it.",
          });
      }

      // Check if any products reference this category
      const products = await Product.find({ proCategoryId: categoryID });
      if (products.length > 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot delete category. Products are referencing it.",
          });
      }

      await Category.findByIdAndDelete(categoryID);
      res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

module.exports = router;
