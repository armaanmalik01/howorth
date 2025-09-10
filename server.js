import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import productRoutes from './routes/product.js';
import orderRoutes from './routes/order.js';
import transactionRoutes from './routes/transaction.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();
// CronJob
import './cronJob.js';

// Middleware

// IMPORTANT: Use a middleware that handles the raw body for signature verification.
// Standard express.json() will parse the body, which will break the signature validation.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static("public"))
app.set('view engine', 'ejs')

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Digital Marketplace API is running',
    timestamp: new Date().toISOString()
  });
});


// Error handling middleware
app.use(errorHandler);

// 404 handler (for spa app)
app.use('*', (req, res) => {
  /*res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });*/
  res.render('index')
});

app.listen(PORT,() => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;