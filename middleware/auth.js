const AdminUser = require('../model/adminUser');
const asyncHandler = require('express-async-handler');

// Simple admin verification
const verifyAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin ID required." 
      });
    }

    const adminUser = await AdminUser.findById(adminId);
    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid admin user." 
      });
    }

    req.admin = adminUser;
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Admin verification failed." 
    });
  }
});

module.exports = { verifyAdmin };