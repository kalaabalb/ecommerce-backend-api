const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Coupon = require('../model/couponCode'); 
const Product = require('../model/product');
const { verifyAdmin } = require('../middleware/auth');

// Get all coupons - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const coupons = await Coupon.find(filter)
            .populate('applicableCategory', 'id name')
            .populate('applicableSubCategory', 'id name')
            .populate('applicableProduct', 'id name')
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        
        res.json({ success: true, message: "Coupons retrieved successfully.", data: coupons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a coupon by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const couponID = req.params.id;
        const coupon = await Coupon.findById(couponID)
            .populate('applicableCategory', 'id name')
            .populate('applicableSubCategory', 'id name')
            .populate('applicableProduct', 'id name')
            .populate('createdBy', 'username name');
            
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }
        res.json({ success: true, message: "Coupon retrieved successfully.", data: coupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new coupon - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    const { couponCode, discountType, discountAmount, minimumPurchaseAmount, endDate, status, applicableCategory, applicableSubCategory, applicableProduct, adminId } = req.body;
    
    if (!couponCode || !discountType || !discountAmount || !endDate || !status) {
        return res.status(400).json({ success: false, message: "Code, discountType, discountAmount, endDate, and status are required." });
    }

    try {
        const coupon = new Coupon({
            couponCode,
            discountType,
            discountAmount,
            minimumPurchaseAmount,
            endDate,
            status,
            applicableCategory,
            applicableSubCategory,
            applicableProduct,
            createdBy: adminId
        });

        const newCoupon = await coupon.save();
        res.json({ success: true, message: "Coupon created successfully.", data: newCoupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a coupon - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        const couponID = req.params.id;
        const { couponCode, discountType, discountAmount, minimumPurchaseAmount, endDate, status, applicableCategory, applicableSubCategory, applicableProduct, adminId } = req.body;
        
        if (!couponCode || !discountType || !discountAmount || !endDate || !status) {
            return res.status(400).json({ success: false, message: "CouponCode, discountType, discountAmount, endDate, and status are required." });
        }

        // Find coupon and check ownership
        const coupon = await Coupon.findById(couponID);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        // Super admin can edit anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && coupon.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only edit your own coupons." });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponID,
            { couponCode, discountType, discountAmount, minimumPurchaseAmount, endDate, status, applicableCategory, applicableSubCategory, applicableProduct },
            { new: true }
        );

        res.json({ success: true, message: "Coupon updated successfully.", data: updatedCoupon });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete a coupon - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        const couponID = req.params.id;
        const { adminId } = req.body;
        
        // Find coupon and check ownership
        const coupon = await Coupon.findById(couponID);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && coupon.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own coupons." });
        }

        await Coupon.findByIdAndDelete(couponID);
        res.json({ success: true, message: "Coupon deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// KEEP THIS ROUTE AS IS - NO CHANGES NEEDED (it's for customers)
router.post('/check-coupon', asyncHandler(async (req, res) => {
    console.log(req.body);
    const { couponCode, productIds, purchaseAmount } = req.body;

    try {
        const coupon = await Coupon.findOne({ couponCode });

        if (!coupon) {
            return res.json({ success: false, message: "Coupon not found." });
        }

        const currentDate = new Date();
        if (coupon.endDate < currentDate) {
            return res.json({ success: false, message: "Coupon is expired." });
        }

        if (coupon.status !== 'active') {
            return res.json({ success: false, message: "Coupon is inactive." });
        }

        if (coupon.minimumPurchaseAmount && purchaseAmount < coupon.minimumPurchaseAmount) {
            return res.json({ success: false, message: "Minimum purchase amount not met." });
        }

        if (!coupon.applicableCategory && !coupon.applicableSubCategory && !coupon.applicableProduct) {
            return res.json({ success: true, message: "Coupon is applicable for all orders.", data: coupon });
        }

        const products = await Product.find({ _id: { $in: productIds } });

        const isValid = products.every(product => {
            if (coupon.applicableCategory && coupon.applicableCategory.toString() !== product.proCategoryId.toString()) {
                return false;
            }
            if (coupon.applicableSubCategory && coupon.applicableSubCategory.toString() !== product.proSubCategoryId.toString()) {
                return false;
            }
            if (coupon.applicableProduct && !product.proVariantId.includes(coupon.applicableProduct.toString())) {
                return false;
            }
            return true;
        });

        if (isValid) {
            return res.json({ success: true, message: "Coupon is applicable for the provided products.", data: coupon });
        } else {
            return res.json({ success: false, message: "Coupon is not applicable for the provided products." });
        }
    } catch (error) {
        console.error('Error checking coupon code:', error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
}));

module.exports = router;