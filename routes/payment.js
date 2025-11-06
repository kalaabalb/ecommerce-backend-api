const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadPaymentProof, cloudinary } = require('../uploadFile');

// Upload payment proof to Cloudinary
router.post('/upload-proof', uploadPaymentProof.single('proofImage'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const imageUrl = req.file.path; // Cloudinary URL
    
    res.json({ 
      success: true, 
      message: "Payment proof uploaded successfully.", 
      data: {
        imageUrl: imageUrl
      }
    });
  } catch (error) {
    console.error('🔴 [UPLOAD] Error uploading payment proof:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Alternative endpoint for base64 image upload to Cloudinary
router.post('/upload-proof-base64', asyncHandler(async (req, res) => {
  try {
    console.log('🟡 [UPLOAD-BASE64] Received upload request');
    const { image, fileName, orderAmount } = req.body;
    
    if (!image || !fileName) {
      console.log('🔴 [UPLOAD-BASE64] Missing image or fileName');
      return res.status(400).json({ success: false, message: "Image data and filename are required." });
    }

    console.log('🟡 [UPLOAD-BASE64] Processing image, fileName:', fileName);

    // Remove data:image/jpeg;base64, prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    
    try {
      // Upload base64 image directly to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(
        `data:image/png;base64,${base64Data}`, 
        {
          folder: 'payment-proofs',
          public_id: `payment_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          resource_type: 'image'
        }
      );

      console.log('🟡 [UPLOAD-BASE64] Cloudinary upload successful');
      
      res.json({ 
        success: true, 
        message: "Payment proof uploaded successfully.", 
        data: {
          imageUrl: uploadResponse.secure_url,
          verified: false,
          verifiedAt: null
        }
      });
      
      console.log('🟡 [UPLOAD-BASE64] Response sent successfully');
      
    } catch (uploadError) {
      console.error('🔴 [UPLOAD-BASE64] Cloudinary upload error:', uploadError);
      throw uploadError;
    }
    
  } catch (error) {
    console.error('🔴 [UPLOAD-BASE64] Error uploading payment proof:', error);
    console.error('🔴 [UPLOAD-BASE64] Error stack:', error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Verify payment (admin endpoint)
router.post('/verify-payment/:orderId', asyncHandler(async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { verified, adminNotes } = req.body;
    
    // Update order payment status
    const Order = require('../model/order');
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        paymentStatus: verified ? 'verified' : 'failed',
        orderStatus: verified ? 'processing' : 'cancelled',
        'paymentProof.verifiedAt': verified ? new Date() : null,
        adminNotes: adminNotes
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    res.json({ 
      success: true, 
      message: `Payment ${verified ? 'verified' : 'rejected'} successfully.`,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

module.exports = router;
