const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    image: { 
        type: String, 
        required: true 
    },
    // Add createdBy field
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);