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
    // ADD THIS:
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true
    }
},{ timestamps: true });