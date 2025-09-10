import express from 'express';
import { body, validationResult } from 'express-validator';
import Transaction from '../models/Transaction.js';
import { authenticate } from '../middleware/auth.js';
import { generateTransactionId, getPagination, canMakeWithdrawal } from '../utils/helpers.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import crypto from "crypto";
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();


const router = express.Router();

// @desc    Create deposit request
// @route   POST /api/transactions/deposit
// @access  Private


var timeout = process.env.PAYMENT_TIMEOUT || 5 * 60 * 1000;
var upi_id = process.env.UPI_ADDRESS || "pay://jakjdk.jfljsa?fjlajdk"

var tr_id = "";
var deposit_busy = false;

var reset = true;

function resetval() {
  if (!reset) {
    console.log("Resetting Values !!");
    deposit_busy = false;
    tr_id = "";
    reset = true;
  }
}

router.post('/deposit', authenticate, [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Deposit amount must be at least ₹1'),
  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'upi', 'wallet', 'other'])
    .withMessage('Invalid payment method'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  if (deposit_busy) {
    return res.status(400).json({
      success: false,
      message: 'Gatway is Busy',
    });
  }
  reset = false;

  const { amount, paymentMethod } = req.body;
  const userId = req.user._id;

  let transac_id = generateTransactionId('deposit')
  tr_id = transac_id;

  // Create deposit transaction
  const transaction = new Transaction({
    userId,
    transactionId: transac_id,
    type: 'deposit',
    amount,
    status: 'pending',
    paymentMethod,
  });

  await transaction.save();

  res.status(201).json({
    success: true,
    message: 'Deposit request submitted successfully',
    data: {
      timeout,
      upi_id: `${upi_id}=${Number(amount).toFixed(2)}`,
      tr_id,
      transaction
    }
  });

  deposit_busy = true;

  setTimeout(() => {
    resetval();
  }, timeout);

}));

router.post('/deposit/check', authenticate, [
  body('tr_id')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  const { tr_id } = req.body;

  const transaction = await Transaction.findOne({ transactionId: tr_id });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: transaction?.status
    }
  })

}));

// @desc    Payment received webhook
// @route   POST /api/transactions/received
// @access  Private Access for razorypay

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';

router.post('/deposit/received', asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Check if a signature is present
  if (!signature) {
    console.error('Webhook received without a signature.');
    return res.status(400).send('Webhook request is missing a signature.');
  }

  // Generate a signature using the HMAC SHA256 algorithm and the raw request body
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(req.rawBody.toString())
    .digest('hex');

  // Compare the received signature with the expected one
  if (expectedSignature === signature) {
    console.log('Webhook signature verified successfully!');

    // Now, process the event payload
    const event = req.body.event;
    const payload = req.body.payload;

    // Check for the 'payment.captured' event
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      console.log('Payment Captured Event Received!');
      console.log('Payment ID:', payment.id);
      console.log('Amount:', payment.amount / 100, payment.currency);
      console.log('Status:', payment.status);

      // You would add your business logic here, such as:
      // - Updating your database with the payment status.
      // - Sending a confirmation email to the customer.
      // - Fulfilling the order.
      // - etc.

      // IMPORTANT: Your response must be a 2xx HTTP status code to acknowledge receipt.
      res.status(200).send('Webhook received and processed.');

      if (tr_id) {
        const transaction = await Transaction.findOneAndUpdate(
          { transactionId: tr_id, amount: (payment.amount / 100) },
          {
            status: "success"
          }
        );
        await User.findByIdAndUpdate(transaction.userId, {
          $inc: { balance: transaction.amount }
        })
        resetval();
      }

    } else {
      console.log('Received an event we are not handling:', event);
      // Respond with a 200 OK even for unhandled events
      res.status(200).send('Event received, but not processed by this handler.');
    }
  } else {
    // If the signatures do not match, send a 400 Bad Request
    console.error('Webhook signature verification failed!');
    res.status(400).send('Invalid signature.');
  }
}));



router.post('/deposit/utr', authenticate, [
  body('utr'),
  body('tr_id')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  const { utr, tr_id } = req.body;

  const transaction = await Transaction.findOneAndUpdate({ transactionId: tr_id }, {
    utr
  }, { new: true });
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.status(200).json({
    success: true,
    message: "Utr is Submitted it take some time to process",
    data: {
      status: transaction
    }
  })
}));


// @desc    Create withdrawal request
// @route   POST /api/transactions/withdraw
// @access  Private
router.post('/withdraw', authenticate, [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Withdrawal amount must be at least ₹1')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { amount } = req.body;
  const user = req.user;

  // Check if user can make withdrawal
  const { canWithdraw, errors: withdrawalErrors } = canMakeWithdrawal(user, amount);

  if (!canWithdraw) {
    return res.status(400).json({
      success: false,
      message: 'No Enough Balance',
      errors: withdrawalErrors
    });
  }

  // Create withdrawal transaction
  const transaction = new Transaction({
    userId: user._id,
    transactionId: generateTransactionId('withdrawal'),
    type: 'withdrawal',
    amount,
    status: 'pending',
  });

  await transaction.save();

  await User.findByIdAndUpdate(
    user._id,
    {
      $inc: { 'balance': -transaction.amount },
    }
  );

  res.status(201).json({
    success: true,
    message: 'Withdrawal Submitted.',
    data: {
      transaction
    }
  });
}));

// @desc    Get user transactions
// @route   GET /api/transactions
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page, limit, type, status } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

  const filter = { userId: req.user._id };

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
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

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id
  })
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.json({
    success: true,
    data: {
      transaction
    }
  });
}));

export default router;