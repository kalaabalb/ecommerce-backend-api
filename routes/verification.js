const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../model/user');
const nodemailer = require('nodemailer');

// Configure email transporter (using Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send email verification code
router.post('/send-email-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    // Generate random 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Check if email already exists and is verified
    const existingUser = await User.findOne({ email, emailVerified: true });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification Code - Your App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D5A7E;">Email Verification</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <br>
          <p>Best regards,<br>Your App Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    // Save verification code to user (or create temp record)
    await User.findOneAndUpdate(
      { email },
      { 
        email: email,
        verificationCode,
        codeExpires,
        emailVerified: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ 
      success: true, 
      message: "Verification code sent to your email." 
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // For development, still return success with code
    if (process.env.NODE_ENV === 'development') {
      // Find the verification code that was attempted to be saved
      const user = await User.findOne({ email });
      const devCode = user ? user.verificationCode : 'unknown';
      
      res.json({ 
        success: true, 
        message: "Verification code sent (development mode).",
        data: { code: devCode }
      });
    } else {
      res.status(500).json({ success: false, message: "Failed to send verification code." });
    }
  }
}));

// Verify email
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and verification code are required." });
  }

  try {
    const user = await User.findOne({ email, verificationCode: code });
    
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid verification code." });
    }

    if (user.codeExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Verification code has expired." });
    }

    // Update user as verified
    user.emailVerified = true;
    user.verificationCode = null;
    user.codeExpires = null;
    await user.save();

    console.log('🟡 [SERVER] Email verified successfully for:', email);
    
    res.json({ 
      success: true, 
      message: "Email verified successfully.",
      data: { 
        userId: user._id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('🔴 [SERVER] Error verifying email:', error);
    res.status(500).json({ success: false, message: "Failed to verify email." });
  }
}));

// Forgot password - send reset code to email
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    const user = await User.findOne({ email, emailVerified: true });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "No verified account found with this email." });
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.verificationCode = resetCode;
    user.codeExpires = codeExpires;
    await user.save();

    // Send reset email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Code - Your App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2D5A7E;">Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password. Your reset code is:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br>Your App Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: "Password reset code sent to your email." 
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    
    // For development
    if (process.env.NODE_ENV === 'development') {
      const user = await User.findOne({ email });
      const devCode = user ? user.verificationCode : 'unknown';
      
      res.json({ 
        success: true, 
        message: "Reset code generated (development mode).",
        data: { code: devCode }
      });
    } else {
      res.status(500).json({ success: false, message: "Failed to process request." });
    }
  }
}));

// Reset password with code
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: "Email, verification code, and new password are required." });
  }

  try {
    const user = await User.findOne({ email, verificationCode: code, emailVerified: true });
    
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid verification code or email not verified." });
    }

    if (user.codeExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Verification code has expired." });
    }

    // Update password and clear verification code
    user.password = newPassword;
    user.verificationCode = null;
    user.codeExpires = null;
    await user.save();

    res.json({ 
      success: true, 
      message: "Password reset successfully." 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: "Failed to reset password." });
  }
}));

// Update user profile (for changing password/email in profile)
router.put('/update-profile/:id', asyncHandler(async (req, res) => {
  try {
    const userID = req.params.id;
    const { name, email, currentPassword, newPassword } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Verify current password if changing password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required to set new password." });
      }
      if (user.password !== currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is incorrect." });
      }
      user.password = newPassword;
    }

    // Update email if provided and different
    if (email && email !== user.email) {
      user.email = email;
      user.emailVerified = false; // Require re-verification for new email
    }

    user.name = name;
    await user.save();

    res.json({ 
      success: true, 
      message: "Profile updated successfully." + (email && email !== user.email ? " Please verify your new email." : ""),
      data: user 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}));

module.exports = router;
