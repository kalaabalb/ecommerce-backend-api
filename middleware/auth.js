const AdminUser = require('../model/adminUser');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign({ adminId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

// Verify JWT token middleware
const verifyAdmin = asyncHandler(async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided."
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      const adminUser = await AdminUser.findById(decoded.adminId).select('-password');
      
      if (!adminUser || !adminUser.isActive) {
        return res.status(401).json({
          success: false,
          message: "Admin user not found or inactive."
        });
      }

      req.admin = adminUser;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token."
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Admin verification failed."
    });
  }
});

// Optional: Verify super admin only
const verifySuperAdmin = asyncHandler(async (req, res, next) => {
  verifyAdmin(req, res, () => {
    if (req.admin.clearanceLevel !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: "Super admin privileges required."
      });
    }
    next();
  });
});

module.exports = { verifyAdmin, verifySuperAdmin, generateToken };
