const express = require("express");
const router = express.Router();
const Poster = require("../model/poster");
const { uploadPosters } = require("../uploadFile");
const multer = require("multer");
const asyncHandler = require("express-async-handler");
const {
  buildOwnedQuery,
  canAccessOwnedDocument,
  loadAdmin,
  requireAdminAuth,
} = require("../middleware/adminAccess");

// Get all posters
router.get(
  "/",
  loadAdmin,
  asyncHandler(async (req, res) => {
    try {
      const posters = await Poster.find(buildOwnedQuery(req, {})).sort({
        _id: -1,
      });

      res.json({
        success: true,
        message: "Posters retrieved successfully.",
        data: posters,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Get a poster by ID
router.get(
  "/:id",
  loadAdmin,
  asyncHandler(async (req, res) => {
    try {
      const posterID = req.params.id;
      const poster = await Poster.findById(posterID);

      if (!poster) {
        return res
          .status(404)
          .json({ success: false, message: "Poster not found." });
      }
      if (!canAccessOwnedDocument(req, poster)) {
        return res.status(403).json({
          success: false,
          message: "You can only access posters you created.",
        });
      }
      res.json({
        success: true,
        message: "Poster retrieved successfully.",
        data: poster,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

// Create a new poster
router.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      uploadPosters.single("img")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.json({ success: false, message: err.message });
        } else if (err) {
          return res.json({ success: false, message: err.message });
        }
        const { posterName } = req.body;
        let imageUrl = "";

        if (req.file) {
          imageUrl = req.file.path;
        }

        if (!posterName) {
          return res
            .status(400)
            .json({ success: false, message: "Name is required." });
        }

        if (!imageUrl) {
          return res
            .status(400)
            .json({ success: false, message: "Image is required." });
        }

        try {
          const newPoster = new Poster({
            posterName: posterName,
            imageUrl: imageUrl,
            createdBy: req.adminUser._id,
          });
          await newPoster.save();
          res.json({
            success: true,
            message: "Poster created successfully.",
            data: newPoster,
          });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }),
);

// Update a poster
router.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    try {
      const posterID = req.params.id;
      uploadPosters.single("img")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.json({ success: false, message: err.message });
        } else if (err) {
          return res.json({ success: false, message: err.message });
        }

        const { posterName } = req.body;
        let image = req.body.image;

        if (req.file) {
          image = req.file.path;
        }

        if (!posterName || !image) {
          return res
            .status(400)
            .json({ success: false, message: "Name and image are required." });
        }

        try {
          const poster = await Poster.findById(posterID);
          if (!poster) {
            return res
              .status(404)
              .json({ success: false, message: "Poster not found." });
          }
          if (!canAccessOwnedDocument(req, poster)) {
            return res.status(403).json({
              success: false,
              message: "You can only edit posters you created.",
            });
          }

          const updatedPoster = await Poster.findByIdAndUpdate(
            posterID,
            {
              posterName: posterName,
              imageUrl: image,
              createdBy: poster.createdBy || req.adminUser._id,
            },
            { new: true },
          );

          res.json({
            success: true,
            message: "Poster updated successfully.",
            data: updatedPoster,
          });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }),
);

// Delete a poster
router.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const posterID = req.params.id;

    try {
      const poster = await Poster.findById(posterID);
      if (!poster) {
        return res
          .status(404)
          .json({ success: false, message: "Poster not found." });
      }
      if (!canAccessOwnedDocument(req, poster)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete posters you created.",
        });
      }

      await Poster.findByIdAndDelete(posterID);
      res.json({ success: true, message: "Poster deleted successfully." });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }),
);

module.exports = router;
