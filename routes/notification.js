const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Notification = require('../model/notification');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID;
const ONE_SIGNAL_REST_API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

// Send notification
router.post('/send-notification', asyncHandler(async (req, res) => {
    const { title, description, imageUrl } = req.body;

    const notificationBody = {
        app_id: ONE_SIGNAL_APP_ID,
        headings: { en: title },
        contents: { en: description },
        included_segments: ['All'],
        ...(imageUrl && { big_picture: imageUrl })
    };

    try {
        const response = await axios.post(
            'https://onesignal.com/api/v1/notifications',
            notificationBody,
            {
                headers: {
                    'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const notificationId = response.data.id;
        console.log('Notification sent to all users:', notificationId);

        const notification = new Notification({ notificationId, title, description, imageUrl });
        await notification.save();

        res.json({ success: true, message: 'Notification sent successfully', data: null });
    } catch (error) {
        console.error('Error sending notification:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to send notification', data: null });
    }
}));

// Track notification
router.get('/track-notification/:id', asyncHandler(async (req, res) => {
    const notificationId = req.params.id;

    try {
        const response = await axios.get(
            `https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${ONE_SIGNAL_APP_ID}`,
            {
                headers: {
                    'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}`
                }
            }
        );

        const androidStats = response.data.platform_delivery_stats;
        const result = {
            platform: 'Android',
            success_delivery: androidStats.android.successful,
            failed_delivery: androidStats.android.failed,
            errored_delivery: androidStats.android.errored,
            opened_notification: androidStats.android.converted
        };

        console.log('Notification details:', androidStats);
        res.json({ success: true, message: 'Success', data: result });
    } catch (error) {
        console.error('Error tracking notification:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to track notification', data: null });
    }
}));

// Get all notifications
router.get('/all-notification', asyncHandler(async (req, res) => {
    try {
        const notifications = await Notification.find({}).sort({ _id: -1 });
        res.json({ success: true, message: 'Notifications retrieved successfully.', data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message, data: null });
    }
}));

// Delete notification
router.delete('/delete-notification/:id', asyncHandler(async (req, res) => {
    const notificationID = req.params.id;
    try {
        const notification = await Notification.findByIdAndDelete(notificationID);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found.', data: null });
        }
        res.json({ success: true, message: 'Notification deleted successfully.', data: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message, data: null });
    }
}));


module.exports = router;
