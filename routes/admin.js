import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateReferralCode, getPagination, sanitizeUser } from '../utils/helpers.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(authenticate, requireAdmin);

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get overall statistics
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    pendingTransactions,
    totalRevenue,
    totalEarningsDistributed
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }), // Use role field
    Product.countDocuments(), // Assuming all products are "active" unless otherwise filtered
    Order.countDocuments(),
    Transaction.countDocuments({ status: 'pending' }),
    Order.aggregate([
      {
        $lookup: {
          from: 'products', // The collection name for productSchema
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $group: { _id: null, total: { $sum: '$product.price' } } } // Correctly sum revenue
    ]).then(result => result[0]?.total || 0),
    Transaction.aggregate([
      {
        $match: {
          type: { $in: ['withdrawal'] }, // Align with transactionSchema enum
          status: 'success' // Align with transactionSchema enum
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0)
  ]);

  // Get recent activities
  const recentOrders = await Order.find()
    .populate('userId', 'fullName phoneNumber')
    .populate('productId', 'productName')
    .sort({ createdAt: -1 })
    .limit(10);

  const recentTransactions = await Transaction.find({ status: 'pending' })
    .populate('userId', 'fullName phoneNumber')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get monthly statistics
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthlyStats = await Order.aggregate([
    { $match: { createdAt: { $gte: currentMonth } } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: null,
        monthlyOrders: { $sum: 1 },
        monthlyRevenue: { $sum: '$product.price' }
      }
    }
  ]);

  const monthlyData = monthlyStats[0] || { monthlyOrders: 0, monthlyRevenue: 0 };

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        pendingTransactions,
        totalRevenue,
        totalEarningsDistributed,
        ...monthlyData
      },
      recentOrders,
      recentTransactions
    }
  });
}));

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, search, role } = req.query; // Use 'role' instead of 'isAdmin'
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

  const filter = {};

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  if (role) { // Correctly filter by role
    filter.role = role;
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}));

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's orders
  const orders = await Order.find({ userId: user._id })
    .populate('productId', 'productName')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get user's transactions
  const transactions = await Transaction.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(10);

  // Get referral information
  const referredUsers = await User.find({ referredBy: user.referralCode })
    .select('fullName phoneNumber createdAt hasPlacedFirstOrder');

  res.json({
    success: true,
    data: {
      user,
      orders,
      transactions,
      referredUsers
    }
  });
}));

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private/Admin
router.post('/users', [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phoneNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  body('password')
    .isLength({ min: 5 }) // Match the schema minlength
    .withMessage('Password must be at least 5 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { fullName, phoneNumber, password, role = "user" } = req.body; // Correctly use role field

  // Check if user already exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this phone number already exists'
    });
  }

  // Generate referral code
  const referralCode = await generateReferralCode();

  const user = new User({
    fullName,
    phoneNumber,
    password,
    referralCode,
    role // Use the role field
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: sanitizeUser(user)
    }
  });
}));

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
router.put('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const allowedFields = ['fullName', 'role', 'balance']; // Use 'role' and 'balance'
  const updateFields = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
}));

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role === 'admin') { // Correctly check for admin role
    return res.status(400).json({
      success: false,
      message: 'Cannot delete admin user'
    });
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @desc    Get all transactions for admin review
// @route   GET /api/admin/transactions
// @access  Private/Admin
router.get('/transactions', asyncHandler(async (req, res) => {
  const { page, limit, type, status } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

  const filter = {};

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  const transactions = await Transaction.find(filter)
    .populate('userId', 'fullName phoneNumber')
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

// @desc    Approve/Reject transaction
// @route   PUT /api/admin/transactions/:id/process
// @access  Private/Admin
router.put('/transactions/:id/process', [
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either approve or reject'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Admin notes cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { action, adminNotes } = req.body;
  const transaction = await Transaction.findById(req.params.id)
    .populate('userId', 'fullName phoneNumber balance'); // Populate user balance

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  if (transaction.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Transaction has already been processed'
    });
  }

  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    if (action === 'approve') {
      if (transaction.type === 'deposit') {
        // Add amount to user's balance
        await User.findByIdAndUpdate(
          transaction.userId._id,
          { $inc: { balance: transaction.amount } }, // Use 'balance'
          { session }
        );
      } else if (transaction.type === 'withdrawal') {
        // Deduct amount from user's balance (Note : Already Amount is Deduct with withdrawal req)
        // const user = await User.findById(transaction.userId._id);
        // if (user.balance < transaction.amount) { // Check balance
        //   throw new Error('Insufficient balance for withdrawal');
        // }

        // await User.findByIdAndUpdate(
        //   transaction.userId._id,
        //   { $inc: { balance: -transaction.amount } }, // Use 'balance'
        //   { session }
        // );
      }

      transaction.status = 'success'; // Update status to 'success'
      transaction.adminNotes = adminNotes;
    } else {
      transaction.status = 'rejected'; // Update status to 'rejected'
      transaction.adminNotes = adminNotes;
    }

    await transaction.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: `Transaction ${action}d successfully`,
      data: {
        transaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
router.get('/orders', asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const orders = await Order.find(filter)
    .populate('userId', 'fullName phoneNumber')
    .populate('productId', 'productName price')
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

// @desc    Get application analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
router.get('/analytics', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days = parseInt(period);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0); // Ensure consistent start time

  // User growth
  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: startDate }, role: 'user' } }, // Correctly check for role
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        newUsers: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Revenue analytics
  const revenueAnalytics = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        dailyRevenue: { $sum: '$product.price' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } }
  ]);

  // Product performance
  const productPerformance = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$productId',
        totalOrders: { $sum: 1 },
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    { $sort: { totalOrders: -1 } }, // Sort by order count
    { $limit: 10 }
  ]);

  res.json({
    success: true,
    data: {
      period: `${days} days`,
      userGrowth,
      revenueAnalytics,
      productPerformance
    }
  });
}));

export default router;