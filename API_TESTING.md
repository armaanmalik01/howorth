# API Testing Guide

This guide provides comprehensive testing instructions for the Digital Product Marketplace Backend API.

## Prerequisites

1. **MongoDB Running**: Ensure MongoDB is running locally or use MongoDB Atlas
2. **Server Running**: Start the server with `npm run dev`
3. **Admin User Seeded**: Run `npm run seed` to create the default admin user
4. **API Testing Tool**: Use Postman, Insomnia, or curl

## Base URL

```
http://localhost:3000/api
```

## Testing Workflow

### 1. Health Check

First, verify the server is running:

```http
GET http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Digital Marketplace API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Admin Login

Login with the default admin credentials:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "phoneNumber": "9999999999",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "fullName": "System Administrator",
      "phoneNumber": "9999999999",
      "referralCode": "ABC123",
      "isAdmin": true,
      "wallet": {
        "balance": 1000
      },
      "referralLink": "http://localhost:3000/register?ref=ABC123"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token** for subsequent admin requests.

### 3. Create Test Products (Admin)

Create some test products using the admin token:

```http
POST http://localhost:3000/api/products
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "productName": "Digital Marketing Course",
  "productImage": "https://example.com/marketing-course.jpg",
  "price": 500,
  "perDayEarning": 25,
  "productValidity": 30,
  "productDescription": "A comprehensive digital marketing course covering SEO, social media, and paid advertising strategies."
}
```

Create another product:

```http
POST http://localhost:3000/api/products
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "productName": "Web Development Bootcamp",
  "productImage": "https://example.com/web-dev-course.jpg",
  "price": 1000,
  "perDayEarning": 50,
  "productValidity": 20,
  "productDescription": "Learn full-stack web development with HTML, CSS, JavaScript, Node.js, and MongoDB."
}
```

### 4. Validate Referral Code

Test referral code validation:

```http
GET http://localhost:3000/api/auth/validate-referral/ABC123
```

Replace `ABC123` with the admin's actual referral code.

### 5. Register New User

Register a new user using the admin's referral code:

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "phoneNumber": "9876543210",
  "password": "password123",
  "referralCode": "ABC123"
}
```

**Save the user token** for subsequent user requests.

### 6. User Login

Test user login:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "phoneNumber": "9876543210",
  "password": "password123"
}
```

### 7. Get User Profile

```http
GET http://localhost:3000/api/user/profile
Authorization: Bearer YOUR_USER_TOKEN
```

### 8. Update Bank Details

```http
PUT http://localhost:3000/api/user/bank-details
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "bankName": "State Bank of India",
  "accountHolderName": "John Doe",
  "accountNumber": "1234567890123456",
  "ifscCode": "SBIN0123456"
}
```

### 9. Get Products

```http
GET http://localhost:3000/api/products?page=1&limit=10
```

### 10. Create Deposit Request

```http
POST http://localhost:3000/api/transactions/deposit
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "amount": 1000,
  "paymentMethod": "upi",
  "paymentReference": "UPI123456789"
}
```

### 11. Approve Deposit (Admin)

First, get pending transactions:

```http
GET http://localhost:3000/api/admin/transactions?status=pending
Authorization: Bearer YOUR_ADMIN_TOKEN
```

Then approve the deposit:

```http
PUT http://localhost:3000/api/admin/transactions/TRANSACTION_ID/process
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "action": "approve",
  "adminNotes": "Deposit verified and approved"
}
```

### 12. Place Order

```http
POST http://localhost:3000/api/orders
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "productId": "PRODUCT_ID_FROM_STEP_3"
}
```

### 13. Get User Orders

```http
GET http://localhost:3000/api/orders
Authorization: Bearer YOUR_USER_TOKEN
```

### 14. Get User Dashboard

```http
GET http://localhost:3000/api/user/dashboard
Authorization: Bearer YOUR_USER_TOKEN
```

### 15. Create Withdrawal Request

```http
POST http://localhost:3000/api/transactions/withdraw
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "amount": 100
}
```

### 16. Admin Dashboard

```http
GET http://localhost:3000/api/admin/dashboard
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 17. Get All Users (Admin)

```http
GET http://localhost:3000/api/admin/users?page=1&limit=10
Authorization: Bearer YOUR_ADMIN_TOKEN
```

## Complete Test Scenarios

### Scenario 1: Complete User Journey

1. **Admin Setup**
   - Login as admin
   - Create products
   - Get admin referral code

2. **User Registration & Setup**
   - Validate referral code
   - Register new user with referral
   - Login as user
   - Update profile
   - Add bank details

3. **Financial Operations**
   - Create deposit request
   - Admin approves deposit
   - Check wallet balance

4. **Product Purchase**
   - Browse products
   - Place order
   - Check order status

5. **Earnings & Withdrawals**
   - Check daily earnings (manual trigger for testing)
   - Create withdrawal request
   - Admin processes withdrawal

### Scenario 2: Referral System Testing

1. **Setup**
   - Login as admin
   - Get admin referral code

2. **First User**
   - Register User A with admin referral
   - User A places first order
   - Check admin wallet for referral bonus

3. **Second Level Referral**
   - Get User A's referral code
   - Register User B with User A's referral
   - User B places first order
   - Check User A's wallet for referral bonus

### Scenario 3: Admin Management

1. **User Management**
   - Get all users
   - View specific user details
   - Update user wallet balance
   - Create new user via admin

2. **Product Management**
   - Create products
   - Update products
   - Get product statistics
   - Deactivate products

3. **Transaction Management**
   - View all transactions
   - Approve/reject deposits
   - Approve/reject withdrawals
   - Add admin notes

4. **Analytics**
   - View dashboard statistics
   - Get application analytics
   - Monitor user growth
   - Track revenue metrics

## Error Testing

### Test Invalid Requests

1. **Invalid Phone Number**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "fullName": "Test User",
  "phoneNumber": "invalid",
  "password": "password123",
  "referralCode": "ABC123"
}
```

2. **Invalid Referral Code**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "fullName": "Test User",
  "phoneNumber": "9876543211",
  "password": "password123",
  "referralCode": "INVALID"
}
```

3. **Insufficient Balance Order**
```http
POST http://localhost:3000/api/orders
Authorization: Bearer USER_TOKEN_WITH_LOW_BALANCE
Content-Type: application/json

{
  "productId": "EXPENSIVE_PRODUCT_ID"
}
```

4. **Withdrawal Without Bank Details**
```http
POST http://localhost:3000/api/transactions/withdraw
Authorization: Bearer USER_TOKEN_WITHOUT_BANK_DETAILS
Content-Type: application/json

{
  "amount": 100
}
```

## Performance Testing

### Load Testing with curl

Create a simple load test script:

```bash
#!/bin/bash
# load_test.sh

for i in {1..100}
do
  curl -X GET http://localhost:3000/api/products &
done
wait
```

### Concurrent User Registration

```bash
#!/bin/bash
# concurrent_registration.sh

for i in {1..10}
do
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"fullName\": \"User $i\",
      \"phoneNumber\": \"987654321$i\",
      \"password\": \"password123\",
      \"referralCode\": \"ABC123\"
    }" &
done
wait
```

## Automated Testing with Newman (Postman CLI)

1. **Export Postman Collection**
   - Create requests in Postman
   - Export as collection.json

2. **Install Newman**
```bash
npm install -g newman
```

3. **Run Tests**
```bash
newman run collection.json -e environment.json
```

## Expected Response Codes

| Endpoint | Method | Success Code | Error Codes |
|----------|--------|--------------|-------------|
| /auth/register | POST | 201 | 400, 409 |
| /auth/login | POST | 200 | 400, 401 |
| /user/profile | GET | 200 | 401 |
| /products | GET | 200 | - |
| /products | POST | 201 | 400, 401, 403 |
| /orders | POST | 201 | 400, 401, 404 |
| /transactions/deposit | POST | 201 | 400, 401 |
| /transactions/withdraw | POST | 201 | 400, 401 |
| /admin/dashboard | GET | 200 | 401, 403 |

## Common Issues & Solutions

### 1. MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in .env
- Verify network connectivity

### 2. JWT Token Expired
- Login again to get new token
- Check JWT_EXPIRES_IN setting

### 3. Validation Errors
- Check request body format
- Ensure all required fields are present
- Verify data types and constraints

### 4. Permission Denied
- Ensure correct user role (admin vs regular user)
- Check Authorization header format
- Verify token is valid

### 5. Referral Code Issues
- Ensure referral code exists
- Check code format (6 characters)
- Verify code belongs to existing user

This testing guide should help you thoroughly test all aspects of the Digital Product Marketplace Backend API.