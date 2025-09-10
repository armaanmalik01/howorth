import crypto from 'crypto';
import User from '../models/User.js';

import dotenv from "dotenv";

dotenv.config();


// Generate unique 6-digit referral code
export const generateReferralCode = async () => {
  let referralCode;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate 6-digit alphanumeric code
    referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Check if code already exists
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return referralCode;
};

// Validate phone number format
export const isValidPhoneNumber = (phoneNumber) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phoneNumber);
};

// Validate referral code format
export const isValidReferralCode = (referralCode) => {
  return referralCode && referralCode.length === 6 && /^[A-Z0-9]{6}$/.test(referralCode);
};

// Generate transaction ID
export const generateTransactionId = (type) => {
  const prefix = {
    'deposit': 'DEP',
    'withdrawal': 'WTH',
    'earning': 'ERN',
    'order': 'ORD',
    'referral': 'REF'
  };
  
  const typePrefix = prefix[type] || 'TXN';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  
  return `${typePrefix}${timestamp}${random}`;
};

// Calculate pagination
export const getPagination = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip
  };
};

// Format currency
export const formatCurrency = (amount) => {
  return `₹${parseFloat(amount).toFixed(2)}`;
};

// Calculate date range
export const getDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return { startDate, endDate };
};

// Validate password strength
export const isValidPassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

// Sanitize user data for response
export const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};

// Check if user can make withdrawal
export const canMakeWithdrawal = (user, amount) => {
  const errors = [];
  
  if (!user.bankDetails.bankName) {
    errors.push('Bank details not submitted');
  }
  
  if (user.balance < amount) {
    errors.push('Insufficient balance');
  }
  
  if (amount < 1) {
    errors.push('Minimum withdrawal amount is ₹1');
  }
  
  return {
    canWithdraw: errors.length === 0,
    errors
  };
};

// Calculate referral bonus
export const calculateReferralBonus = () => {
  return process.env.INVITE_AMOUNT || 50; // Fixed bonus amount as per requirements
};

// Generate random string
export const generateRandomString = (length = 10) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};