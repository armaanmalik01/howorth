import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import User from '../models/User.js';
import { generateReferralCode } from '../utils/helpers.js';

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('🌱 Starting admin user seeding...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      phoneNumber: process.env.ADMIN_PHONE
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with phone:', process.env.ADMIN_PHONE);

      console.log('Admin Details:');
      console.log('- Name:', existingAdmin.fullName);
      console.log('- Phone:', existingAdmin.phoneNumber);
      console.log('- Referral Code:', existingAdmin.referralCode);
      console.log('- Referral Link:', existingAdmin.getReferralLink());

      process.exit(0);
    }

    // Generate referral code for admin
    const adminReferralCode = await generateReferralCode();

    // Create admin user
    const adminUser = new User({
      fullName: process.env.ADMIN_NAME || 'System Administrator',
      phoneNumber: process.env.ADMIN_PHONE,
      password: process.env.ADMIN_PASSWORD,
      referralCode: adminReferralCode,
      role : "admin",
      balance: 1000 // Give admin some initial balance for testing
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Details:');
    console.log('- Name:', adminUser.fullName);
    console.log('- Phone:', adminUser.phoneNumber);
    console.log('- Password:', process.env.ADMIN_PASSWORD);
    console.log('- Referral Code:', adminUser.referralCode);
    console.log('- Referral Link:', adminUser.getReferralLink());
    console.log('- Initial Wallet Balance: ₹1000');

    console.log('\n🔐 Login Credentials:');
    console.log('Phone:', process.env.ADMIN_PHONE);
    console.log('Password:', process.env.ADMIN_PASSWORD);

    console.log('\n🎯 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Login with admin credentials');
    console.log('3. Create some products');
    console.log('4. Test the referral system');
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
  }finally {
    process.exit();
  }
};

// Run the seeding function
seedAdmin();