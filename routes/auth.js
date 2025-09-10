import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { generateReferralCode, isValidPhoneNumber, isValidReferralCode, sanitizeUser } from '../utils/helpers.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phoneNumber')
    .custom((value) => {
      if (!isValidPhoneNumber(value)) {
        throw new Error('Please enter a valid 10-digit phone number');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 6 characters long'),
  body('referralCode')
    .custom((value) => {
      if (!isValidReferralCode(value)) {
        throw new Error('Please enter a valid 6-character referral code');
      }
      return true;
    })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { fullName, phoneNumber, password, referralCode } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ phoneNumber });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this phone number already exists'
    });
  }

  // Validate referral code
  const referrer = await User.findOne({ referralCode });
  if (!referrer) {
    return res.status(400).json({
      success: false,
      message: 'Invalid referral code'
    });
  }

  // Generate unique referral code for new user
  const newUserReferralCode = await generateReferralCode();

  // Create new user
  const user = new User({
    fullName,
    phoneNumber,
    password,
    referralCode: newUserReferralCode,
    referredBy: referralCode
  });

  await user.save();

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: sanitizeUser(user),
      token
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('phoneNumber')
    .custom((value) => {
      if (!isValidPhoneNumber(value)) {
        throw new Error('Please enter a valid 10-digit phone number');
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { phoneNumber, password } = req.body;

  // Find user by phone number
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid phone number or password'
    });
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid phone number or password'
    });
  }

  // Generate JWT token
  const token = generateToken(user._id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: sanitizeUser(user),
      token
    }
  });
}));

// @desc    Validate referral code
// @route   GET /api/auth/validate-referral/:code
// @access  Public
router.get('/validate-referral/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;

  if (!isValidReferralCode(code)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid referral code format'
    });
  }

  const referrer = await User.findOne({ referralCode: code }).select('fullName referralCode');
  
  if (!referrer) {
    return res.status(404).json({
      success: false,
      message: 'Invalid referral code'
    });
  }

  res.json({
    success: true,
    message: 'Valid referral code',
    data: {
      referrerName: referrer.fullName,
      referralCode: referrer.referralCode
    }
  });
}));

export default router;