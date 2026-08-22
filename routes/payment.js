const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();
const { uploadPaymentProof, cloudinary } = require("../uploadFile");
const {
  requireAdminAuth,
} = require("../middleware/adminAccess");

// Upload payment proof to Cloudinary
router.post(
  "/upload-proof",
  uploadPaymentProof.single("proofImage"),
  asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded." });
      }

      const imageUrl = req.file.path; // Cloudinary URL

      res.json({
        success: true,
        message: "Payment proof uploaded successfully.",
        data: {
          imageUrl: imageUrl,
        },
      });
    } catch (error) {
      console.error("🔴 [UPLOAD] Error uploading payment proof:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Alternative endpoint for base64 image upload to Cloudinary
router.post(
  "/upload-proof-base64",
  asyncHandler(async (req, res) => {
    try {
      const { image, fileName } = req.body;

      if (!image || !fileName) {
        return res.status(400).json({
          success: false,
          message: "Image data and filename are required.",
        });
      }

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      try {
        const uploadResponse = await cloudinary.uploader.upload(
          `data:image/png;base64,${base64Data}`,
          {
            folder: "payment-proofs",
            public_id: `payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            resource_type: "image",
          },
        );

        res.json({
          success: true,
          message: "Payment proof uploaded successfully.",
          data: {
            imageUrl: uploadResponse.secure_url,
            verified: false,
            verifiedAt: null,
          },
        });
      } catch (uploadError) {
        throw uploadError;
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Verify payment (admin endpoint)
router.post(
  "/verify-payment/:orderId",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const { verified, adminNotes } = req.body;

      // Update order payment status
      const Order = require("../model/order");
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: verified ? "verified" : "failed",
          orderStatus: verified ? "processing" : "cancelled",
          "paymentProof.verifiedAt": verified ? new Date() : null,
          adminNotes: adminNotes,
        },
        { new: true },
      );

      if (!updatedOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });
      }

      res.json({
        success: true,
        message: `Payment ${verified ? "verified" : "rejected"} successfully.`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

module.exports = router;
