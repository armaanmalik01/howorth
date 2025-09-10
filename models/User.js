import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [5, 'Password must be at least 6 characters']
  },
  referralCode: {
    type: String,
    unique: true,
    required: true,
    length: 6
  },
  referredBy: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum : ["user", "admin"],
    default: "user",
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  bankDetails: {
    bankName: {
      type: String,
      default: null
    },
    accountHolderName: {
      type: String,
      default: null
    },
    accountNumber: {
      type: String,
      default: null
    },
    ifscCode: {
      type: String,
      default: null
    }
  },
  hasPlacedFirstOrder: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ phoneNumber: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate referral link
userSchema.methods.getReferralLink = function () {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${this.referralCode}`;
};

// Virtual for referral link
userSchema.virtual('referralLink').get(function () {
  return this.getReferralLink();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

export default User;