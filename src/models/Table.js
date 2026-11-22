const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: 'Serein table' },
  capacity: { type: Number, required: true, min: [1, 'Table capacity must be at least 1'], max: 20 },
  isAvailable: { type: Boolean, default: true },
});

module.exports = mongoose.model('Table', tableSchema);
