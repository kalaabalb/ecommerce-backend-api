const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();
const Order = require("../model/order");
const Product = require("../model/product");
const {
  requireAdminAuth,
  requireUserAuth,
  loadAdmin,
  loadUser,
} = require("../middleware/adminAccess");

// Get all orders
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      await loadUser(req, res, () => {});
      if (req.authUser) {
        const orders = await Order.find({ userID: req.authUser._id })
          .populate("userID", "id name")
          .sort({ _id: -1 });
        return res.json({
          success: true,
          message: "Orders retrieved successfully.",
          data: orders,
        });
      }

      await loadAdmin(req, res, () => {});
      if (!req.adminUser) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login again.",
        });
      }

      const orders = await Order.find()
        .populate("userID", "id name")
        .sort({ _id: -1 });
      res.json({
        success: true,
        message: "Orders retrieved successfully.",
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get orders by user ID
router.get(
  "/orderByUserId/:userId",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    try {
      const userId = req.params.userId;
      if (req.authUser._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own orders.",
        });
      }
      const orders = await Order.find({ userID: userId })
        .populate("userID", "id name")
        .sort({ _id: -1 });
      res.json({
        success: true,
        message: "Orders retrieved successfully.",
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get an order by ID
router.get(
  "/:id",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    try {
      const orderID = req.params.id;
      const order = await Order.findById(orderID).populate("userID", "id name");
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });
      }

      if (
        order.userID &&
        order.userID._id.toString() !== req.authUser._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own orders.",
        });
      }
      res.json({
        success: true,
        message: "Order retrieved successfully.",
        data: order,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Create a new order
router.post(
  "/",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    const {
      userID,
      orderStatus,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      paymentProof,
      orderTotal,
      trackingUrl,
    } = req.body;

    if (!items || !totalPrice || !shippingAddress || !paymentMethod || !orderTotal) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "User ID, items, totalPrice, shippingAddress, paymentMethod, and orderTotal are required.",
        });
    }

    // Validate payment method
    const validPaymentMethods = ["cod", "cbe", "telebirr"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method." });
    }

    if (userID && userID !== req.authUser._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only create orders for your own account.",
      });
    }

    // Set default payment status if not provided
    const finalPaymentStatus =
      paymentStatus || (paymentMethod === "cod" ? "pending" : "pending");
    const finalOrderStatus =
      orderStatus || (paymentMethod === "cod" ? "pending" : "payment_pending");

    try {
      const order = new Order({
        userID: req.authUser._id,
        orderStatus: finalOrderStatus,
        items,
        totalPrice,
        shippingAddress,
        paymentMethod,
        paymentStatus: finalPaymentStatus,
        paymentProof,
        orderTotal,
        trackingUrl,
      });
      const newOrder = await order.save();
      res.json({
        success: true,
        message: "Order created successfully.",
        data: newOrder,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Update an order status
router.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const orderID = req.params.id;
      const { orderStatus, trackingUrl } = req.body;
      if (!orderStatus) {
        return res
          .status(400)
          .json({ success: false, message: "Order Status required." });
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderID,
        { orderStatus, trackingUrl },
        { new: true },
      );

      if (!updatedOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });
      }

      res.json({
        success: true,
        message: "Order updated successfully.",
        data: updatedOrder,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Verify payment (admin endpoint)
router.put(
  "/:id/verify-payment",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const orderID = req.params.id;
      const { verified, adminNotes } = req.body;

      if (typeof verified !== "boolean") {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Verification status (verified) is required and must be boolean.",
          });
      }

      const order = await Order.findById(orderID);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });
      }

      // Update payment status and order status
      order.paymentStatus = verified ? "verified" : "failed";
      order.orderStatus = verified ? "processing" : "cancelled";

      // Update payment proof verification if payment proof exists
      if (order.paymentProof) {
        order.paymentProof.verified = verified;
        order.paymentProof.verifiedAt = verified ? new Date() : null;
      }

      const updatedOrder = await order.save();

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

// Update payment proof
router.put(
  "/:id/payment-proof",
  requireUserAuth,
  asyncHandler(async (req, res) => {
    try {
      const orderID = req.params.id;
      const { imageUrl } = req.body;

      if (!imageUrl) {
        return res
          .status(400)
          .json({ success: false, message: "Image URL is required." });
      }

      const order = await Order.findById(orderID);
      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });
      }

      if (order.userID.toString() !== req.authUser._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own order payment proof.",
        });
      }

      // Update or create payment proof
      order.paymentProof = {
        imageUrl: imageUrl,
        uploadedAt: new Date(),
        verified: false,
        verifiedAt: null,
      };

      // For non-COD payments, set status to payment pending
      if (order.paymentMethod !== "cod") {
        order.orderStatus = "payment_pending";
        order.paymentStatus = "pending";
      }

      const updatedOrder = await order.save();

      res.json({
        success: true,
        message: "Payment proof updated successfully.",
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Error updating payment proof:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get orders by payment status
router.get(
  "/payment-status/:status",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const paymentStatus = req.params.status;
      const validStatuses = ["pending", "verified", "failed"];

      if (!validStatuses.includes(paymentStatus)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid payment status." });
      }

      const orders = await Order.find({ paymentStatus: paymentStatus })
        .populate("userID", "id name")
        .sort({ _id: -1 });

      res.json({
        success: true,
        message: "Orders retrieved successfully.",
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get orders requiring payment verification (admin endpoint)
router.get(
  "/admin/pending-verification",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const orders = await Order.find({
        paymentMethod: { $in: ["cbe", "telebirr"] },
        paymentStatus: "pending",
        "paymentProof.imageUrl": { $exists: true, $ne: null },
      })
        .populate("userID", "id name")
        .sort({ _id: -1 });

      res.json({
        success: true,
        message: "Orders pending payment verification retrieved successfully.",
        data: orders,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Delete an order
router.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const orderID = req.params.id;
      const deletedOrder = await Order.findByIdAndDelete(orderID);
      if (!deletedOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found." });
      }
      res.json({ success: true, message: "Order deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

module.exports = router;
