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
const { verifyAdmin, verifySuperAdmin, generateToken } = require('../middleware/auth');

// Admin login - UPDATED WITH JWT
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  try {
    const adminUser = await AdminUser.findOne({ username, isActive: true });

    if (!adminUser) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    // SECURE password comparison with bcrypt
    if (!(await adminUser.correctPassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    // Generate JWT token
    const token = generateToken(adminUser._id);

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
      data: {
        user: userResponse,
        token: token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get current admin profile
router.get('/profile', verifyAdmin, asyncHandler(async (req, res) => {
  try {
    res.json({ 
      success: true, 
      message: "Profile retrieved successfully.", 
      data: req.admin 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get all admin users (super admin only) - UPDATED MIDDLEWARE
router.get('/', verifySuperAdmin, asyncHandler(async (req, res) => {
  try {
    const adminUsers = await AdminUser.find({ isActive: true })
      .select('-password')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, message: "Admin users retrieved successfully.", data: adminUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get admin user by ID - UPDATED MIDDLEWARE
router.get('/:id', verifyAdmin, asyncHandler(async (req, res) => {
  try {
    // Regular admins can only view their own profile, super admins can view any
    if (req.admin.clearanceLevel !== 'super_admin' && req.params.id !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only view your own profile." });
    }

    const adminUser = await AdminUser.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'name username');

    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    res.json({ success: true, message: "Admin user retrieved successfully.", data: adminUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Create new admin user (super admin only) - UPDATED MIDDLEWARE
router.post('/', verifySuperAdmin, asyncHandler(async (req, res) => {
  const { username, name, email, password, clearanceLevel } = req.body;

  if (!username || !name || !email || !password) {
    return res.status(400).json({ success: false, message: "Username, name, email, and password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
  }

  try {
    // Check if username or email already exists
    const existingUser = await AdminUser.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username or email already exists." });
    }

    const adminUser = new AdminUser({
      username,
      name,
      email,
      password,
      clearanceLevel: clearanceLevel || 'admin',
      createdBy: req.admin._id
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

    res.json({ success: true, message: "Admin user created successfully.", data: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Username or email already exists." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Update admin user - UPDATED PERMISSION LOGIC
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
  const { name, email, clearanceLevel, isActive, password } = req.body;

  try {
    // Only super admin can update other admin users
    if (req.admin.clearanceLevel !== 'super_admin' && req.params.id !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only update your own profile." });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    
    // Only super admin can change clearance level and active status
    if (req.admin.clearanceLevel === 'super_admin') {
      if (clearanceLevel) updateData.clearanceLevel = clearanceLevel;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
    }

    const adminUser = await AdminUser.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    res.json({ success: true, message: "Admin user updated successfully.", data: adminUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Delete admin user and all their data (super admin only) - UPDATED MIDDLEWARE
router.delete('/:id', verifySuperAdmin, asyncHandler(async (req, res) => {
  try {
    const adminUser = await AdminUser.findById(req.params.id);

    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    // Prevent self-deletion
    if (adminUser._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
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

    res.json({ success: true, message: "Admin user and all associated data deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Deactivate admin user (soft delete) - super admin only - UPDATED MIDDLEWARE
router.put('/:id/deactivate', verifySuperAdmin, asyncHandler(async (req, res) => {
  try {
    // Prevent self-deactivation
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot deactivate your own account." });
    }

    const adminUser = await AdminUser.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin user not found." });
    }

    res.json({ success: true, message: "Admin user deactivated successfully.", data: adminUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

module.exports = router;
