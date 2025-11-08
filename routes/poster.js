const express = require('express');
const router = express.Router();
const Poster = require('../model/poster');
const { uploadPosters } = require('../uploadFile');
const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { verifyAdmin } = require('../middleware/auth');

// Get all posters - FILTER BY ADMIN
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { adminId } = req.query;
        
        let filter = {};
        if (adminId) {
            filter.createdBy = adminId;
        }

        const posters = await Poster.find(filter)
            .populate('createdBy', 'username name')
            .sort({ _id: -1 });
        
        res.json({ success: true, message: "Posters retrieved successfully.", data: posters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a poster by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const posterID = req.params.id;
        const poster = await Poster.findById(posterID)
            .populate('createdBy', 'username name');
            
        if (!poster) {
            return res.status(404).json({ success: false, message: "Poster not found." });
        }
        res.json({ success: true, message: "Poster retrieved successfully.", data: poster });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new poster - SIMPLE ADMIN CHECK
router.post('/', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        uploadPosters.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.json({ success: false, message: err.message });
            } else if (err) {
                return res.json({ success: false, message: err.message });
            }
            const { posterName, adminId } = req.body;
            let imageUrl = '';

            if (req.file) {
                imageUrl = req.file.path;
            }

            if (!posterName) {
                return res.status(400).json({ success: false, message: "Name is required." });
            }

            if (!imageUrl) {
                return res.status(400).json({ success: false, message: "Image is required." });
            }

            try {
                const newPoster = new Poster({
                    posterName: posterName,
                    imageUrl: imageUrl,
                    createdBy: adminId
                });
                await newPoster.save();
                res.json({ success: true, message: "Poster created successfully.", data: newPoster });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Update a poster - SIMPLE OWNERSHIP CHECK
router.put('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    try {
        const posterID = req.params.id;
        uploadPosters.single('img')(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                return res.json({ success: false, message: err.message });
            } else if (err) {
                return res.json({ success: false, message: err.message });
            }

            const { posterName, adminId } = req.body;
            let image = req.body.image;

            if (req.file) {
                image = req.file.path;
            }

            if (!posterName || !image) {
                return res.status(400).json({ success: false, message: "Name and image are required." });
            }

            try {
                // Find poster and check ownership
                const poster = await Poster.findById(posterID);
                if (!poster) {
                    return res.status(404).json({ success: false, message: "Poster not found." });
                }

                // Super admin can edit anything, regular admins only their own
                if (req.admin.clearanceLevel !== 'super_admin' && poster.createdBy.toString() !== adminId) {
                    return res.status(403).json({ success: false, message: "You can only edit your own posters." });
                }

                const updatedPoster = await Poster.findByIdAndUpdate(
                    posterID, 
                    { posterName: posterName, imageUrl: image }, 
                    { new: true }
                );
                
                res.json({ success: true, message: "Poster updated successfully.", data: updatedPoster });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Delete a poster - SIMPLE OWNERSHIP CHECK
router.delete('/:id', verifyAdmin, asyncHandler(async (req, res) => {
    const posterID = req.params.id;
    const { adminId } = req.body;
    
    try {
        // Find poster and check ownership
        const poster = await Poster.findById(posterID);
        if (!poster) {
            return res.status(404).json({ success: false, message: "Poster not found." });
        }

        // Super admin can delete anything, regular admins only their own
        if (req.admin.clearanceLevel !== 'super_admin' && poster.createdBy.toString() !== adminId) {
            return res.status(403).json({ success: false, message: "You can only delete your own posters." });
        }

        await Poster.findByIdAndDelete(posterID);
        res.json({ success: true, message: "Poster deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;