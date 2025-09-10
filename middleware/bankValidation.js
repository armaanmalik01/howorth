// Middleware to check if user has submitted bank details before withdrawal
export const requireBankDetails = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user.bankDetails.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: 'Please submit your bank details before making a withdrawal request.',
        code: 'BANK_DETAILS_REQUIRED'
      });
    }

    // Validate that all required bank details are present
    const { bankName, accountHolderName, accountNumber, ifscCode } = user.bankDetails;
    
    if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete bank details. Please update your bank information.',
        code: 'INCOMPLETE_BANK_DETAILS'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during bank details validation.'
    });
  }
};

// Validate bank details format
export const validateBankDetails = (req, res, next) => {
  const { bankName, accountHolderName, accountNumber, ifscCode } = req.body;

  // Validation rules
  const errors = [];

  if (!bankName || bankName.trim().length < 2) {
    errors.push('Bank name must be at least 2 characters long');
  }

  if (!accountHolderName || accountHolderName.trim().length < 2) {
    errors.push('Account holder name must be at least 2 characters long');
  }

  if (!accountNumber || !/^[0-9]{9,18}$/.test(accountNumber)) {
    errors.push('Account number must be 9-18 digits');
  }

  if (!ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    errors.push('IFSC code must be in valid format (e.g., SBIN0123456)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid bank details',
      errors
    });
  }

  next();
};