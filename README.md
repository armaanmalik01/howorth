# Digital Product Marketplace Backend

A comprehensive backend application for a digital product marketplace built with Node.js, Express, and MongoDB. Features include user management with phone-based authentication, referral system, digital wallet, product management, and automated daily earnings.

## 🚀 Features

### Core Functionalities
- **Phone-based Authentication**: Users register and login using phone numbers
- **Referral System**: Unique 6-digit referral codes with automatic bonus distribution
- **Digital Wallet**: Credit-based system with deposits, withdrawals, and earnings
- **Product Management**: Digital products with daily earning mechanics
- **Order Processing**: Automated daily earnings distribution
- **Transaction Management**: Admin-approved deposits and withdrawals
- **Admin Dashboard**: Comprehensive management interface
- **User Analytics**: Personal dashboard with earnings and referral statistics

### Technical Features
- **ES Modules**: Modern JavaScript module system
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error management
- **Scheduled Tasks**: Automated daily earnings processing
- **Transaction Safety**: Database transactions for critical operations

## 📋 Requirements

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd digital-marketplace-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```envPORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://armaanmalik998494:L8EbxxPshFaFCmEw@cluster0.2mscw6t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
ADMIN_PHONE=9999999999
ADMIN_PASSWORD=admin123
ADMIN_NAME=System Administrator
RAZORPAY_WEBHOOK_SECRET=AToRItEiNeQuIlCUPLAR
PAYMENT_TIMEOUT=120000
UPI_ADDRESS=upi://pay?ver=01&mode=19&pa=noisewaves744274.rzp@icici&pn=NoiseWaves&tr=RZPRFWdaKM5WLQNfPqrv2&cu=INR&mc=5732&qrMedium=04&tn=PaymenttoNoiseWaves&am
INVITE_AMOUNT=100
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Seed Admin User**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "phoneNumber": "9876543210",
  "password": "password123",
  "referralCode": "ABC123"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "phoneNumber": "9876543210",
  "password": "password123"
}
```

#### Validate Referral Code
```http
GET /auth/validate-referral/ABC123
```

### User Endpoints

#### Get Profile
```http
GET /user/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Smith"
}
```

#### Change Password
```http
PUT /user/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### Get/Update Bank Details
```http
GET /user/bank-details
PUT /user/bank-details
Authorization: Bearer <token>
Content-Type: application/json

{
  "bankName": "State Bank of India",
  "accountHolderName": "John Doe",
  "accountNumber": "1234567890123456",
  "ifscCode": "SBIN0123456"
}
```

#### Get Wallet Balance
```http
GET /user/wallet
Authorization: Bearer <token>
```

#### Get Referral Information
```http
GET /user/referral
Authorization: Bearer <token>
```

#### Get Dashboard
```http
GET /user/dashboard
Authorization: Bearer <token>
```

### Product Endpoints

#### Get All Products
```http
GET /products?page=1&limit=10&search=keyword&minPrice=100&maxPrice=1000&sortBy=price_asc
```

#### Get Single Product
```http
GET /products/:id
```

#### Create Product (Admin Only)
```http
POST /products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "productName": "Digital Course",
  "productImage": "https://example.com/image.jpg",
  "price": 500,
  "perDayEarning": 25,
  "productValidity": 30,
  "productDescription": "A comprehensive digital course"
}
```

### Order Endpoints

#### Create Order
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here"
}
```

#### Get User Orders
```http
GET /orders?page=1&limit=10&status=active
Authorization: Bearer <token>
```

#### Get Single Order
```http
GET /orders/:id
Authorization: Bearer <token>
```

### Transaction Endpoints

#### Create Deposit Request
```http
POST /transactions/deposit
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000,
  "paymentMethod": "upi",
  "paymentReference": "UPI123456789"
}
```

#### Create Withdrawal Request
```http
POST /transactions/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500
}
```

#### Get Transactions
```http
GET /transactions?page=1&limit=10&type=deposit&status=pending
Authorization: Bearer <token>
```

### Admin Endpoints

#### Get Dashboard
```http
GET /admin/dashboard
Authorization: Bearer <admin-token>
```

#### Get All Users
```http
GET /admin/users?page=1&limit=10&search=john
Authorization: Bearer <admin-token>
```

#### Process Transaction
```http
PUT /admin/transactions/:id/process
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "approve",
  "adminNotes": "Approved after verification"
}
```

## 🏗️ Project Structure

```
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── bankValidation.js    # Bank details validation
│   └── errorHandler.js      # Error handling middleware
├── models/
│   ├── User.js              # User model
│   ├── Product.js           # Product model
│   ├── Order.js             # Order model
│   └── Transaction.js       # Transaction model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── user.js              # User routes
│   ├── product.js           # Product routes
│   ├── order.js             # Order routes
│   ├── transaction.js       # Transaction routes
│   └── admin.js             # Admin routes
├── scripts/
│   └── seedAdmin.js         # Admin user seeding script
├── services/
│   └── earningsService.js   # Daily earnings processing
├── utils/
│   └── helpers.js           # Utility functions
├── .env                     # Environment variables
├── server.js                # Main server file
└── package.json             # Dependencies and scripts
```

## 🔄 Daily Earnings System

The system automatically processes daily earnings for active orders:

- **Scheduled Processing**: Runs daily at 00:01 using node-cron
- **Eligibility Check**: Verifies order status and earning eligibility
- **Automatic Credit**: Credits daily earnings to user wallets
- **Transaction Records**: Creates transaction records for all earnings
- **Order Completion**: Automatically completes orders when validity expires

## 💰 Referral System

- **Unique Codes**: Each user gets a 6-digit alphanumeric referral code
- **Referral Links**: Automatic generation of referral links
- **Bonus Distribution**: ₹20 bonus when referred user places first order
- **Tracking**: Complete referral hierarchy and statistics

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive request validation
- **Admin Protection**: Role-based access control
- **Transaction Safety**: Database transactions for critical operations

## 🧪 Testing

### Manual Testing Steps

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Seed admin user**
   ```bash
   npm run seed
   ```

3. **Test admin login**
   - Use phone: 9999999999
   - Password: admin123

4. **Create test products**
   - Login as admin
   - Create products via API

5. **Test user registration**
   - Register with admin's referral code
   - Verify referral system

6. **Test order flow**
   - Place orders
   - Check daily earnings processing

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start server.js --name "marketplace-api"
pm2 startup
pm2 save
```

## 📝 Default Admin Credentials

After running the seed script:
- **Phone**: 9999999999
- **Password**: admin123
- **Initial Balance**: ₹1000

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs for debugging

## 🔄 Version History

- **v1.0.0**: Initial release with all core features
  - Phone-based authentication
  - Referral system
  - Digital wallet
  - Product management
  - Order processing
  - Admin dashboard

  - Daily earnings automation
