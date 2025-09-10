import cron from 'node-cron';
import mongoose from 'mongoose';
import Order from './models/Order.js'; // Adjust path
import Product from './models/Product.js'; // Adjust path
import User from './models/User.js'; // Adjust path

// Define the function to update balances
const updateBalances = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeOrders = await Order.find({ status: 'active' }).populate('productId').session(session);

    for (const order of activeOrders) {
      const product = await Product.findById(order.productId).session(session);

      if (product) {
        const perDayEarning = product.perDayEarning;

        // Update user balance
        await User.findByIdAndUpdate(order.userId, {
          $inc: { balance: perDayEarning }
        }, { new: true, session });

        // Decrement order validity
        order.validity -= 1;

        if (order.validity <= 0) {
          order.status = 'completed';
          order.endDate = new Date(); // Set end date when the order is completed
        }

        await order.save({ session });
        console.log(`Updated balance for user ${order.userId} by ${perDayEarning} and decremented order ${order._id}`);
      }
    }

    await session.commitTransaction();
    console.log('Daily balance update job completed successfully.');

  } catch (error) {
    console.error('Error during daily balance update cron job:', error);
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
};

// Schedule the cron job to run every day at midnight (e.g., 00:00)
cron.schedule('0 0 * * *', () => {
  console.log('Running daily balance update cron job...');
  updateBalances();
}, {
  timezone: "Asia/Kolkata" // Set to your desired timezone
});