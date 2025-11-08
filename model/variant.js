const variantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    variantTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VariantType',
        required: true
    },
    // ADD THIS:
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true
    }
},{ timestamps: true });