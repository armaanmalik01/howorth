import mongoose from "mongoose";

const giftSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "gift code is required"],
        length: 5,
        unique: true
    },
    amount: {
        type: Number,
        required: [true, 'gift Amount is Required'],
        min: 1
    },
    expaired: {
        type: Boolean,
        default: false
    }
})

const Gift = mongoose.model('Gift', giftSchema);

export default Gift;