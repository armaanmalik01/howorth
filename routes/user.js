import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { authenticate } from '../middleware/auth.js';
import { validateBankDetails } from '../middleware/bankValidation.js';
import { sanitizeUser, getPagination } from '../utils/helpers.js';
import { getUserEarningsSummary } from '../services/earningsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.json({
    success: true,
    data: {
      user: sanitizeUser(user)
    }
  });
}));

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
router.put('/profile', authenticate, [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { fullName } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullName },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: sanitizeUser(user)
    }
  });
}));

// @desc    Change password
// @route   PUT /api/user/change-password
// @access  Private
router.put('/change-password', authenticate, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;
  
  const user = await User.findById(req.user._id);
  
  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @desc    Get/Update bank details
// @route   GET/PUT /api/user/bank-details
// @access  Private
router.route('/bank-details')
  .get(authenticate, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: {
        bankDetails: user.bankDetails
      }
    });
  }))
  .put(authenticate, validateBankDetails, asyncHandler(async (req, res) => {
    const { bankName, accountHolderName, accountNumber, ifscCode } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        'bankDetails.bankName': bankName,
        'bankDetails.accountHolderName': accountHolderName,
        'bankDetails.accountNumber': accountNumber,
        'bankDetails.ifscCode': ifscCode,
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      data: {
        bankDetails: user.bankDetails
      }
    });
  }));

// @desc    Get wallet balance
// @route   GET /api/user/wallet
// @access  Private
router.get('/wallet', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    success: true,
    data: {
      balance: user.balance
    }
  });
}));

// @desc    Get referral information
// @route   GET /api/user/referral
// @access  Private
router.get('/referral', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  // Get referred users
  const referredUsers = await User.find({ 
    referredBy: user.referralCode 
  }).select('fullName createdAt hasPlacedFirstOrder');

  res.json({
    success: true,
    data: {
      referralCode: user.referralCode,
      referralLink: user.getReferralLink(),
      totalReferrals: referredUsers?.length,
      referredUsers
    }
  });
}));

// @desc    Get user dashboard/analytics
// @route   GET /api/user/dashboard
// @access  Private
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get earnings summary
  const earningsSummary = await getUserEarningsSummary(userId);
  
  // Get recent orders
  const recentOrders = await Order.find({ userId })
    .populate('productId', 'productName productImage')
    .sort({ createdAt: -1 })
    .limit(2);

  // Get recent transactions
  const recentTransactions = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(4);

  // Get referral stats
  const user = await User.findById(userId);
  const referredUsers = await User.find({ 
    referredBy: user.referralCode 
  }).select('createdAt hasPlacedFirstOrder');

  const referralStats = {
    totalReferrals: referredUsers.length,
    activeReferrals: referredUsers.filter(u => u.hasPlacedFirstOrder).length,
    pendingReferrals: referredUsers.filter(u => !u.hasPlacedFirstOrder).length
  };

  res.json({
    success: true,
    data: {
      earnings: earningsSummary,
      recentOrders,
      recentTransactions,
      referralStats,
      walletBalance: user.balance
    }
  });
}));

// @desc    Get user orders
// @route   GET /api/user/orders
// @access  Private
router.get('/orders', authenticate, asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);
  
  const filter = { userId: req.user._id };
  if (status) {
    filter.status = status;
  }

  
  const orders = await Order.find(filter)
    .populate('productId', 'productName productImage price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}));

// @desc    Get user transactions
// @route   GET /api/user/transactions
// @access  Private
router.get('/transactions', authenticate, asyncHandler(async (req, res) => {
  const { page, limit, type } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);
  
  const filter = { userId: req.user._id };
  if (type) {
    filter.type = type;
  }

  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Transaction.countDocuments(filter);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}));

export default router;