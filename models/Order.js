import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  validity: {
    type: Number, // Change type to Number to represent days
    required: true // Make it required
  }
}, {
  timestamps: true
});

// Calculate end date before saving
orderSchema.pre('save', function (next) {
  // Check if it's a new document and validity is a positive number
  if (this.isNew && this.validity && typeof this.validity === 'number' && this.validity > 0) {
    const startDate = this.startDate || new Date();
    const endDate = new Date(startDate);
    
    // Use setDate to correctly add the number of days
    endDate.setDate(startDate.getDate() + this.validity);
    
    this.endDate = endDate;
  }
  next();
});

// Index for better query performance
orderSchema.index({ userId: 1 });
orderSchema.index({ productId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ endDate: 1 });
orderSchema.index({ createdAt: -1 });


// Ensure virtual fields are serialized
orderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Order = mongoose.model('Order', orderSchema);

export default Order;