const mongoose = require('mongoose');

const variantTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'], 
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Type is required'],
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true
    }
},{ timestamps: true });

module.exports = mongoose.model('VariantType', variantTypeSchema);