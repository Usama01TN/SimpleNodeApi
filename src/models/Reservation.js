const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  table: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true,
  },
  reservationDate: {
    type: Date,
    required: true,
    index: true,
  },
  guestCount: {
    type: Number,
    min: [1, 'At least one guest is required'],
    max: [20, 'Please contact the restaurant for groups larger than 20'],
    default: 2,
  },
  specialRequest: {
    type: String,
    maxlength: [400, 'Special requests must be 400 characters or fewer'],
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },
}, { timestamps: true });

reservationSchema.index({ table: 1, reservationDate: 1, status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
