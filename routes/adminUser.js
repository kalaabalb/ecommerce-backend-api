
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const AdminUser = require('../model/adminUser');
const Product = require('../model/product');
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Brand = require('../model/brand');
const VariantType = require('../model/variantType');
const Variant = require('../model/variant');
const Coupon = require('../model/couponCode');
const Poster = require('../model/poster');

// Middleware to check if user is super admin
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  // This would typically check JWT token or session
  // For now, we'll assume super admin check is done via query param or header
  const { clearanceLevel } = req.body;
  
  if (clearanceLevel !== 'super_admin') {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied. Super admin privileges required." 
    });
  }
  next();
});

// Admin login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Username and password are required." 
    });
  }

  try {
    // Find admin user
    const adminUser = await AdminUser.findOne({ 
      username,
      isActive: true 
    });

    if (!adminUser) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password." 
      });
    }

    // In a real app, you'd use bcrypt for password hashing
    // For now, we'll do plain text comparison (NOT RECOMMENDED FOR PRODUCTION)
    if (adminUser.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password." 
      });
    }

    // Return user data (excluding password)
    const userResponse = {
      _id: adminUser._id,
      username: adminUser.username,
      name: adminUser.name,
      email: adminUser.email,
      clearanceLevel: adminUser.clearanceLevel,
      createdBy: adminUser.createdBy,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt
    };

    res.json({ 
      success: true, 
      message: "Login successful.", 
      data: userResponse 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

// Get all admin users (super admin only)
router.get('/', asyncHandler(async (req, res) => {
  try {
    const adminUsers = await AdminUser.find({ isActive: true })
      .select('-password')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      message: "Admin users retrieved successfully.", 
      data: adminUsers 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

// Get admin user by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const adminUser = await AdminUser.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name username');

    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin user not found." 
      });
    }

    res.json({ 
      success: true, 
      message: "Admin user retrieved successfully.", 
      data: adminUser 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

// Create new admin user (super admin only)
router.post('/', asyncHandler(async (req, res) => {
  const { username, name, email, password, clearanceLevel, createdBy } = req.body;

  if (!username || !name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Username, name, email, and password are required." 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 6 characters long." 
    });
  }

  try {
    // Check if username or email already exists
    const existingUser = await AdminUser.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Username or email already exists." 
      });
    }

    const adminUser = new AdminUser({
      username,
      name,
      email,
      password, // In production, hash this password!
      clearanceLevel: clearanceLevel || 'admin',
      createdBy: createdBy || null
    });

    await adminUser.save();

    // Return user without password
    const userResponse = {
      _id: adminUser._id,
      username: adminUser.username,
      name: adminUser.name,
      email: adminUser.email,
      clearanceLevel: adminUser.clearanceLevel,
      createdBy: adminUser.createdBy,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt
    };

    res.json({ 
      success: true, 
      message: "Admin user created successfully.", 
      data: userResponse 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Username or email already exists." 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

// Update admin user
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, email, clearanceLevel, isActive } = req.body;

  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (clearanceLevel) updateData.clearanceLevel = clearanceLevel;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const adminUser = await AdminUser.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin user not found." 
      });
    }

    res.json({ 
      success: true, 
      message: "Admin user updated successfully.", 
      data: adminUser 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already exists." 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

// Delete admin user and all their data (super admin only)
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const adminUser = await AdminUser.findById(req.params.id);

    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin user not found." 
      });
    }

    const userId = adminUser._id;

    // Delete all data created by this user
    await Promise.all([
      Product.deleteMany({ createdBy: userId }),
      Category.deleteMany({ createdBy: userId }),
      SubCategory.deleteMany({ createdBy: userId }),
      Brand.deleteMany({ createdBy: userId }),
      VariantType.deleteMany({ createdBy: userId }),
      Variant.deleteMany({ createdBy: userId }),
      Coupon.deleteMany({ createdBy: userId }),
      Poster.deleteMany({ createdBy: userId })
    ]);

    // Delete the admin user
    await AdminUser.findByIdAndDelete(userId);

    res.json({ 
      success: true, 
      message: "Admin user and all associated data deleted successfully." 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

// Deactivate admin user (soft delete)
router.put('/:id/deactivate', asyncHandler(async (req, res) => {
  try {
    const adminUser = await AdminUser.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin user not found." 
      });
    }

    res.json({ 
      success: true, 
      message: "Admin user deactivated successfully.", 
      data: adminUser 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}));

module.exports = router;
