import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal',],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'success'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: null
  },
  // For deposit requests
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'wallet', 'other'],
    default: 'upi'
  },
  utr : {
    type : String,
    required : false,
    default : null
  }
}, {
  timestamps: true
});

// Generate transaction ID before saving
transactionSchema.pre('save', function (next) {
  if (this.isNew && !this.transactionId) {
    const prefix = {
      'deposit': 'DEP',
      'withdrawal': 'WTH',
    };

    this.transactionId = prefix[this.type] + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Index for better query performance
transactionSchema.index({ userId: 1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });

// Method to approve transaction
transactionSchema.methods.approve = function (notes = null) {
  this.status = 'approved';
  if (notes) this.adminNotes = notes;
};

// Method to reject transaction
transactionSchema.methods.reject = function (notes = null) {
  this.status = 'rejected';
  if (notes) this.adminNotes = notes;
};

// Method to complete transaction
transactionSchema.methods.complete = function (notes = null) {
  this.status = 'completed';
  if (notes) this.adminNotes = notes;
};

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
  return `₹${this.amount.toFixed(2)}`;
});

// Ensure virtual fields are serialized
transactionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;