const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Rating = require('../model/rating');
const mongoose = require('mongoose'); // ADD THIS LINE

// Get ratings for a product with pagination
router.get('/product/:productId', asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const ratings = await Rating.find({ productId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Rating.countDocuments({ productId });
    
    res.json({
      success: true,
      message: "Ratings retrieved successfully.",
      data: {
        ratings,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        ratingCount: count
      }
    });
  } catch (error) {
    console.error('Error getting ratings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get rating stats for a product
router.get('/product/:productId/stats', asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    
    const stats = await Rating.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } }, // This line needs mongoose
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
          distribution: {
            $push: '$rating'
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return res.json({
        success: true,
        message: "No ratings found.",
        data: {
          averageRating: 0,
          ratingCount: 0,
          distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        }
      });
    }
    
    // Calculate distribution
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    stats[0].distribution.forEach(rating => {
      distribution[rating.toString()]++;
    });
    
    res.json({
      success: true,
      message: "Rating stats retrieved successfully.",
      data: {
        averageRating: parseFloat(stats[0].averageRating.toFixed(1)),
        ratingCount: stats[0].ratingCount,
        distribution
      }
    });
  } catch (error) {
    console.error('Error getting rating stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get user's rating for a product
router.get('/product/:productId/user/:userId', asyncHandler(async (req, res) => {
  try {
    const { productId, userId } = req.params;
    
    const rating = await Rating.findOne({ 
      productId, 
      userId 
    });
    
    // Return 200 with null data instead of 404
    res.json({
      success: true,
      message: rating ? "User rating retrieved successfully." : "No rating found.",
      data: rating || null
    });
    
  } catch (error) {
    console.error('Error getting user rating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Create or update rating
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { productId, userId, userName, rating, review } = req.body;
    
    if (!productId || !userId || !userName || !rating) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID, User ID, User Name, and Rating are required." 
      });
    }
    
    // Check if user already rated this product
    const existingRating = await Rating.findOne({ productId, userId });
    
    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review || existingRating.review;
      await existingRating.save();
      
      res.json({
        success: true,
        message: "Rating updated successfully.",
        data: existingRating
      });
    } else {
      // Create new rating
      const newRating = new Rating({
        productId,
        userId,
        userName,
        rating,
        review: review || ''
      });
      
      await newRating.save();
      
      res.json({
        success: true,
        message: "Rating created successfully.",
        data: newRating
      });
    }
  } catch (error) {
    console.error('Error creating rating:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already rated this product." 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Update a rating
router.put('/:id', asyncHandler(async (req, res) => {
  try {
    const ratingId = req.params.id;
    const { rating, review } = req.body;
    
    const updatedRating = await Rating.findByIdAndUpdate(
      ratingId,
      { rating, review },
      { new: true }
    );
    
    if (!updatedRating) {
      return res.status(404).json({ 
        success: false, 
        message: "Rating not found." 
      });
    }
    
    res.json({
      success: true,
      message: "Rating updated successfully.",
      data: updatedRating
    });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Delete a rating
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const ratingId = req.params.id;
    
    const deletedRating = await Rating.findByIdAndDelete(ratingId);
    
    if (!deletedRating) {
      return res.status(404).json({ 
        success: false, 
        message: "Rating not found." 
      });
    }
    
    res.json({
      success: true,
      message: "Rating deleted successfully."
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

module.exports = router;
