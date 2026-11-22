const mongoose = require('mongoose');
const Table = require('../models/Table');

exports.getByCapacity = async (req, res) => {
  try {
    const minCapacity = Number(req.params.min);
    if (!Number.isInteger(minCapacity) || minCapacity < 1) return res.status(400).json({ message: 'Minimum capacity must be a positive number.' });
    const tables = await Table.find({ capacity: { $gte: minCapacity }, isAvailable: { $ne: false } }).sort({ capacity: 1 });
    res.json(tables);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.removeIfCapacityOK = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    if (table.capacity > 6) return res.status(403).json({ message: 'Cannot delete table with capacity greater than 6' });
    await table.deleteOne();
    res.json({ message: 'Table deleted successfully' });
  } catch (error) { res.status(400).json({ message: 'Invalid table ID' }); }
};

exports.getAll = async (req, res) => {
  const tables = await Table.find().sort({ capacity: 1 });
  res.json(tables);
};

exports.getOne = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid table ID' });
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) { res.status(400).json({ message: 'Invalid table ID' }); }
};

exports.create = async (req, res) => {
  try {
    const table = await Table.create(req.body);
    res.status(201).json(table);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const updates = {};
    for (const field of ['name', 'capacity', 'isAvailable']) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
    }
    const updatedTable = await Table.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updatedTable) return res.status(404).json({ message: 'Table not found' });
    res.json(updatedTable);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid table ID' });
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    if (table.capacity > 6) return res.status(400).json({ message: 'Cannot delete table with capacity > 6' });
    await table.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(400).json({ message: 'Invalid table ID' }); }
};

exports.removeAll = async (req, res) => {
  await Table.deleteMany({});
  res.json({ message: 'All tables deleted' });
};
