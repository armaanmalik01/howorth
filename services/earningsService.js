import Order from '../models/Order.js';
import User from '../models/User.js';

export const processpayment = async () => {
    
}


export const getUserEarningsSummary = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get active orders
    const activeOrders = await Order.find({
      userId,
      status: 'active'
    }).populate('productId');

    // Calculate today's potential earnings
    const todaysPotentialEarnings = activeOrders.reduce((sum, order) => {
      return sum + order.productId.perDayEarning
    }, 0);

    return {
      todaysPotentialEarnings,
      activeOrdersCount: activeOrders.length,
      walletBalance: user.balance
    };

  } catch (error) {
    console.error('Error getting user earnings summary:', error);
    throw error;
  }
};