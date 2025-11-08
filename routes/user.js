const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../model/user');

// Get all users
router.get('/', asyncHandler(async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, message: "Users retrieved successfully.", data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
    const { name, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ name });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid name or password." });
        }

        // SECURE password comparison with bcrypt
        if (!(await user.correctPassword(password))) {
            return res.status(401).json({ success: false, message: "Invalid name or password." });
        }

        // Authentication successful
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            phone: user.phone,
            phoneVerified: user.phoneVerified,
            createdAt: user.createdAt
        };

        res.status(200).json({ success: true, message: "Login successful.", data: userResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a user by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const user = await User.findById(userID).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User retrieved successfully.", data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ success: false, message: "Name and password are required." });
  }

  try {
    const user = new User({ name, email, password }); // Password will be hashed automatically
    const newUser = await user.save();
    
    const userResponse = {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        createdAt: newUser.createdAt
    };

    res.json({ success: true, message: "User created successfully. Please verify your email.", data: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Update a user
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const { name, password, currentPassword } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // If changing password, verify current password first
        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ success: false, message: "Current password is required to set new password." });
            }
            if (!(await user.correctPassword(currentPassword))) {
                return res.status(400).json({ success: false, message: "Current password is incorrect." });
            }
            user.password = password; // Will be hashed automatically
        }

        user.name = name;
        await user.save();

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            updatedAt: user.updatedAt
        };

        res.json({ success: true, message: "User updated successfully.", data: userResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a user
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userID);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;