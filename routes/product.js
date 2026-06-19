const express = require("express");
const router = express.Router();
const Product = require("../model/product");
const multer = require("multer");
const { uploadProduct } = require("../uploadFile");
const asyncHandler = require("express-async-handler");

// Get all products with filtering
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const { search, category, inStock } = req.query;

      let filter = {};

      // Search filter
      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      // Category filter
      if (category) {
        filter.proCategoryId = category;
      }

      // Stock filter
      if (inStock === "true") {
        filter.quantity = { $gt: 0 };
      } else if (inStock === "false") {
        filter.quantity = { $lte: 0 };
      }

      const products = await Product.find(filter)
        .populate("proCategoryId", "id name")
        .populate("proSubCategoryId", "id name")
        .populate("proBrandId", "id name")
        .populate("proVariantTypeId", "id type")
        .populate("proVariantId", "id name")
        .sort({ _id: -1 });

      res.json({
        success: true,
        message: "Products retrieved successfully.",
        data: products,
        count: products.length,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({
        success: false,
        message: "Unable to load products. Please try again later.",
      });
    }
  }),
);

// Get a product by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const productID = req.params.id;

      if (!productID) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required.",
        });
      }

      const product = await Product.findById(productID)
        .populate("proCategoryId", "id name")
        .populate("proSubCategoryId", "id name")
        .populate("proBrandId", "id name")
        .populate("proVariantTypeId", "id name")
        .populate("proVariantId", "id name");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found. It may have been deleted.",
        });
      }

      res.json({
        success: true,
        message: "Product details retrieved successfully.",
        data: product,
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID format.",
        });
      }
      res.status(500).json({
        success: false,
        message: "Unable to load product details. Please try again.",
      });
    }
  }),
);

// Create new product
router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      uploadProduct.fields([
        { name: "image1", maxCount: 1 },
        { name: "image2", maxCount: 1 },
        { name: "image3", maxCount: 1 },
        { name: "image4", maxCount: 1 },
        { name: "image5", maxCount: 1 },
      ])(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}. Please check file size and format.`,
          });
        } else if (err) {
          return res.status(500).json({
            success: false,
            message: `Upload failed: ${err.message}`,
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
          } = req.body;

          // Enhanced validation
          if (!name || !name.trim()) {
            return res.status(400).json({
              success: false,
              message: "Product name is required.",
            });
          }

          if (!quantity || quantity < 0) {
            return res.status(400).json({
              success: false,
              message: "Valid quantity is required.",
            });
          }

          if (!price || price < 0) {
            return res.status(400).json({
              success: false,
              message: "Valid price is required.",
            });
          }

          if (!proCategoryId) {
            return res.status(400).json({
              success: false,
              message: "Product category is required.",
            });
          }

          if (!proSubCategoryId) {
            return res.status(400).json({
              success: false,
              message: "Product subcategory is required.",
            });
          }

          // Process images
          const imageUrls = [];
          const fields = ["image1", "image2", "image3", "image4", "image5"];
          fields.forEach((field, index) => {
            if (req.files[field] && req.files[field].length > 0) {
              const file = req.files[field][0];
              imageUrls.push({ image: index + 1, url: file.path });
            }
          });

          if (imageUrls.length === 0) {
            return res.status(400).json({
              success: false,
              message: "At least one product image is required.",
            });
          }

          // Create new product
          const newProduct = new Product({
            name: name.trim(),
            description: description ? description.trim() : "",
            quantity: parseInt(quantity),
            price: parseFloat(price),
            offerPrice: offerPrice ? parseFloat(offerPrice) : undefined,
            proCategoryId,
            proSubCategoryId,
            proBrandId,
            proVariantTypeId,
            proVariantId: proVariantId
              ? Array.isArray(proVariantId)
                ? proVariantId
                : [proVariantId]
              : [],
            images: imageUrls,
          });

          await newProduct.save();

          // Populate the created product for response
          const populatedProduct = await Product.findById(newProduct._id)
            .populate("proCategoryId", "id name")
            .populate("proSubCategoryId", "id name")
            .populate("proBrandId", "id name");

          res.status(201).json({
            success: true,
            message: "Product created successfully!",
            data: populatedProduct,
          });
        } catch (dbError) {
          console.error("Database error creating product:", dbError);
          if (dbError.name === "ValidationError") {
            const errors = Object.values(dbError.errors).map(
              (err) => err.message,
            );
            return res.status(400).json({
              success: false,
              message: "Validation failed",
              errors: errors,
            });
          }
          res.status(500).json({
            success: false,
            message: "Failed to create product. Please try again.",
          });
        }
      });
    } catch (error) {
      console.error("Unexpected error in product creation:", error);
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      });
    }
  }),
);

// Update a product
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    try {
      uploadProduct.fields([
        { name: "image1", maxCount: 1 },
        { name: "image2", maxCount: 1 },
        { name: "image3", maxCount: 1 },
        { name: "image4", maxCount: 1 },
        { name: "image5", maxCount: 1 },
      ])(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`,
          });
        } else if (err) {
          return res.status(500).json({
            success: false,
            message: `Upload failed: ${err.message}`,
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
          } = req.body;

          // Find product
          const product = await Product.findById(productId);
          if (!product) {
            return res.status(404).json({
              success: false,
              message: "Product not found.",
            });
          }

          // Update fields with validation
          if (name && name.trim()) product.name = name.trim();
          if (description !== undefined)
            product.description = description.trim();
          if (quantity !== undefined) product.quantity = parseInt(quantity);
          if (price !== undefined) product.price = parseFloat(price);
          if (offerPrice !== undefined) {
            product.offerPrice = offerPrice ? parseFloat(offerPrice) : null;
          }
          if (proCategoryId) product.proCategoryId = proCategoryId;
          if (proSubCategoryId) product.proSubCategoryId = proSubCategoryId;
          if (proBrandId) product.proBrandId = proBrandId;
          if (proVariantTypeId) product.proVariantTypeId = proVariantTypeId;
          if (proVariantId) {
            product.proVariantId = Array.isArray(proVariantId)
              ? proVariantId
              : [proVariantId];
          }

          // Update images if new ones uploaded
          const fields = ["image1", "image2", "image3", "image4", "image5"];
          fields.forEach((field, index) => {
            if (req.files[field] && req.files[field].length > 0) {
              const file = req.files[field][0];
              const imageUrl = file.path;

              let imageEntry = product.images.find(
                (img) => img.image === index + 1,
              );
              if (imageEntry) {
                imageEntry.url = imageUrl;
              } else {
                product.images.push({ image: index + 1, url: imageUrl });
              }
            }
          });

          // Validate before saving
          await product.validate();
          await product.save();

          // Populate the updated product for response
          const updatedProduct = await Product.findById(productId)
            .populate("proCategoryId", "id name")
            .populate("proSubCategoryId", "id name")
            .populate("proBrandId", "id name");

          res.json({
            success: true,
            message: "Product updated successfully!",
            data: updatedProduct,
          });
        } catch (dbError) {
          console.error("Database error updating product:", dbError);
          if (dbError.name === "ValidationError") {
            const errors = Object.values(dbError.errors).map(
              (err) => err.message,
            );
            return res.status(400).json({
              success: false,
              message: "Validation failed",
              errors: errors,
            });
          }
          res.status(500).json({
            success: false,
            message: "Failed to update product. Please try again.",
          });
        }
      });
    } catch (error) {
      console.error("Unexpected error in product update:", error);
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      });
    }
  }),
);

// Delete a product
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const productID = req.params.id;

    if (!productID) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required.",
      });
    }

    try {
      const product = await Product.findById(productID);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found. It may have been already deleted.",
        });
      }

      await Product.findByIdAndDelete(productID);
      res.json({
        success: true,
        message: "Product deleted successfully!",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID format.",
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to delete product. Please try again.",
      });
    }
  }),
);

module.exports = router;
