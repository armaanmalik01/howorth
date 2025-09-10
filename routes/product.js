import express from 'express';
import { body, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getPagination } from '../utils/helpers.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @desc    Get all products (public)
// @route   GET /api/products
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, search, minPrice, maxPrice, sortBy } = req.query;
  const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

  // Build filter
  const filter = {  };

  if (search) {
    filter.$or = [
      { productName: { $regex: search, $options: 'i' } },
      { productDescription: { $regex: search, $options: 'i' } }
    ];
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Build sort
  let sort = { createdAt: -1 };
  if (sortBy) {
    switch (sortBy) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'earning_asc':
        sort = { perDayEarning: 1 };
        break;
      case 'earning_desc':
        sort = { perDayEarning: -1 };
        break;
      case 'validity_asc':
        sort = { productValidity: 1 };
        break;
      case 'validity_desc':
        sort = { productValidity: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
  }

  const products = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  const total = await Product.countDocuments(filter);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}));

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.json({
    success: true,
    data: {
      product
    }
  });
}));

// @desc    Create product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
router.post('/', authenticate, requireAdmin, [
  body('productName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('productImage')
    .isURL()
    .withMessage('Product image must be a valid URL')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('Product image must be a valid image URL'),
  body('price')
    .isFloat({ min: 1 })
    .withMessage('Price must be at least 1 credit'),
  body('perDayEarning')
    .isFloat({ min: 0.01 })
    .withMessage('Per day earning must be at least 0.01 credits'),
  body('productValidity')
    .isInt({ min: 1 })
    .withMessage('Product validity must be at least 1 day'),
  body('productDescription')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Product description must be between 10 and 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    productName,
    productImage,
    price,
    perDayEarning,
    productValidity,
    productDescription
  } = req.body;

  const product = new Product({
    productName,
    productImage,
    price,
    perDayEarning,
    productValidity,
    productDescription,
  });

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      product
    }
  });
}));

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', authenticate, requireAdmin, [
  body('productName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('productImage')
    .optional()
    .isURL()
    .withMessage('Product image must be a valid URL')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('Product image must be a valid image URL'),
  body('price')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Price must be at least 1 credit'),
  body('perDayEarning')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Per day earning must be at least 0.01 credits'),
  body('productValidity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Product validity must be at least 1 day'),
  body('productDescription')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Product description must be between 10 and 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const updateFields = {};
  const allowedFields = [
    'productName', 'productImage', 'price', 'perDayEarning',
    'productValidity', 'productDescription'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  });

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  )

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product: updatedProduct
    }
  });
}));

// @desc    Delete product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Soft delete - just mark as inactive
  await Product.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
}));

export default router;