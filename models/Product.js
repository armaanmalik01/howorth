import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  productImage: {
    type: String,
    required: [true, 'Product image URL is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Please provide a valid image URL'
    }
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [1, 'Price must be at least 1 credit']
  },
  productValidity: {
    type: Number,
    required: [true, 'Product validity is required'],
    min: [1, 'Product validity must be at least 1 day']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    default : ""
  },
  perDayEarning : {
    type: Number,
    required : true
  }
}, {
  timestamps: true
});


// Index for better query performance
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });


// Ensure virtual fields are serialized
productSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Product = mongoose.model('Product', productSchema);

export default Product;