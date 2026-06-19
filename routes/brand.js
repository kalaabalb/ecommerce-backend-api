const express = require("express");
const router = express.Router();
const Brand = require("../model/brand");
const Product = require("../model/product");
const asyncHandler = require("express-async-handler");
const {
  buildOwnedQuery,
  canAccessOwnedDocument,
  loadAdmin,
  requireAdminAuth,
} = require("../middleware/adminAccess");

// Get all brands
router.get(
  "/",
  loadAdmin,
  asyncHandler(async (req, res) => {
    try {
      const brands = await Brand.find(buildOwnedQuery(req, {}))
        .populate("subcategoryId")
        .sort({ _id: -1 });

      res.json({
        success: true,
        message: "Brands retrieved successfully.",
        data: brands,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get a brand by ID
router.get(
  "/:id",
  loadAdmin,
  asyncHandler(async (req, res) => {
    try {
      const brandID = req.params.id;
      const brand = await Brand.findById(brandID).populate("subcategoryId");

      if (!brand) {
        return res
          .status(404)
          .json({ success: false, message: "Brand not found." });
      }
      if (!canAccessOwnedDocument(req, brand)) {
        return res.status(403).json({
          success: false,
          message: "You can only access brands you created.",
        });
      }
      res.json({
        success: true,
        message: "Brand retrieved successfully.",
        data: brand,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Create a new brand
router.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { name, subcategoryId } = req.body;

    if (!name || !subcategoryId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name and subcategory ID are required.",
        });
    }

    try {
      const brand = new Brand({
        name,
        subcategoryId,
        createdBy: req.adminUser._id,
      });
      const newBrand = await brand.save();
      res.json({
        success: true,
        message: "Brand created successfully.",
        data: newBrand,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Update a brand
router.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const brandID = req.params.id;
    const { name, subcategoryId } = req.body;

    if (!name || !subcategoryId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name and subcategory ID are required.",
        });
    }

    try {
      const brand = await Brand.findById(brandID);
      if (!brand) {
        return res
          .status(404)
          .json({ success: false, message: "Brand not found." });
      }
      if (!canAccessOwnedDocument(req, brand)) {
        return res.status(403).json({
          success: false,
          message: "You can only edit brands you created.",
        });
      }

      const updatedBrand = await Brand.findByIdAndUpdate(
        brandID,
        {
          name,
          subcategoryId,
          createdBy: brand.createdBy || req.adminUser._id,
        },
        { new: true },
      );

      res.json({
        success: true,
        message: "Brand updated successfully.",
        data: updatedBrand,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Delete a brand
router.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const brandID = req.params.id;

    try {
      const brand = await Brand.findById(brandID);
      if (!brand) {
        return res
          .status(404)
          .json({ success: false, message: "Brand not found." });
      }
      if (!canAccessOwnedDocument(req, brand)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete brands you created.",
        });
      }

      // Check if any products reference this brand
      const products = await Product.find({ proBrandId: brandID });
      if (products.length > 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Cannot delete brand. Products are referencing it.",
          });
      }

      await Brand.findByIdAndDelete(brandID);
      res.json({ success: true, message: "Brand deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

module.exports = router;
