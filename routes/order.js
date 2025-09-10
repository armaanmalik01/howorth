import express from 'express';
import { body, validationResult } from 'express-validator';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { getPagination, calculateReferralBonus } from '../utils/helpers.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', authenticate, [
  body('productId')
    .isMongoId()
    .withMessage('Invalid product ID')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { productId } = req.body;
  const userId = req.user._id;

  // Get product details
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Get user details
  const user = await User.findById(userId);

  // Check if user has sufficient balance
  if (user.balance < product.price) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient wallet balance',
      required: product.price,
      available: user.balance
    });
  }

  // Check if this is user's first order
  const isFirstOrder = !user.hasPlacedFirstOrder;

  // Create order
  const order = new Order({
    userId,
    productId,
    validity: product.productValidity
  });

  // Start transaction session for atomic operations
  const session = await Order.startSession();
  session.startTransaction();

  try {
    // Save order
    await order.save({ session });

    // Deduct amount from user's wallet
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { 'balance': -product.price },
        $set: { hasPlacedFirstOrder: true }
      },
      { session }
    );

    // Handle referral bonus if this is first order
    if (isFirstOrder && user.referredBy) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        const bonusAmount = calculateReferralBonus();
        // Add bonus to referrer's wallet
        await User.findByIdAndUpdate(
          referrer._id,
          { $inc: { 'balance': bonusAmount } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('productId', 'productName productImage price')
      .populate('userId', 'fullName phoneNumber');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order: populatedOrder
      }
    });

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

  const filter = { userId: req.user._id };
  if (status) {
    filter.status = status;
  }

  const orders = await Order.find(filter)
    .populate('productId', 'productName productImage price perDayEarning')
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

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user._id
  })
    .populate('productId')
    .populate('userId', 'fullName phoneNumber');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
  res.json({
    success: true,
    data: {
      order,
    }
  });
}));


export default router;