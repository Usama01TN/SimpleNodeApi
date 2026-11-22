const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const Guest = require('../models/Guest');
const Invoice = require('../models/Invoice');

const isAdmin = (req) => req.user?.role === 'admin';
const ownsReservation = (req, reservation) => isAdmin(req) || String(reservation.user) === String(req.user?.userId);

exports.createReservation = async (req, res) => {
  try {
    const { table: tableId, reservationDate, guestCount = 2, specialRequest = '' } = req.body;
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({ message: 'Please select a valid table.' });
    }
    const date = new Date(reservationDate);
    if (!reservationDate || Number.isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({ message: 'Please choose a date and time in the future.' });
    }
    const guests = Number(guestCount);
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
      return res.status(400).json({ message: 'Guest count must be between 1 and 20.' });
    }
    if (typeof specialRequest !== 'string' || specialRequest.length > 400) {
      return res.status(400).json({ message: 'Special requests must be 400 characters or fewer.' });
    }

    const table = await Table.findById(tableId);
    if (!table || table.isAvailable === false) {
      return res.status(404).json({ message: 'That table is not available. Please choose another one.' });
    }
    if (Number(table.capacity || 0) < guests) {
      return res.status(400).json({ message: 'This table does not have enough seats for your group.' });
    }

    // A reservation occupies the table for a 90-minute seating window.
    const buffer = 90 * 60 * 1000;
    const conflict = await Reservation.findOne({
      table: tableId,
      status: { $ne: 'cancelled' },
      reservationDate: { $gte: new Date(date.getTime() - buffer), $lte: new Date(date.getTime() + buffer) },
    });
    if (conflict) {
      return res.status(409).json({ message: 'That table has another reservation close to this time. Please choose a different slot or table.' });
    }

    const reservation = await Reservation.create({
      user: req.user.userId,
      table: tableId,
      reservationDate: date,
      guestCount: guests,
      specialRequest: specialRequest.trim(),
    });
    const populated = await Reservation.findById(reservation._id).populate('table', 'name capacity');
    res.status(201).json(populated);
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(', ') });
    console.error('Create reservation error:', error);
    res.status(500).json({ message: 'Could not create the reservation. Please try again.' });
  }
};

exports.getReservations = async (req, res) => {
  try {
    const query = isAdmin(req) ? {} : { user: req.user.userId };
    const reservations = await Reservation.find(query)
      .populate('user', 'name email')
      .populate('table', 'name capacity')
      .sort({ reservationDate: -1 });
    res.json(reservations);
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ message: 'Could not load reservations.' });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid reservation ID.' });
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });
    if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You can only cancel your own reservations.' });
    if (new Date(reservation.reservationDate) <= new Date()) return res.status(400).json({ message: 'Past reservations can no longer be cancelled.' });
    if (reservation.status === 'cancelled') return res.json({ message: 'This reservation is already cancelled.', reservation });
    reservation.status = 'cancelled';
    await reservation.save();
    res.json({ message: 'Reservation cancelled successfully.', reservation });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ message: 'Could not cancel the reservation.' });
  }
};

// Guest and invoice endpoints retained for the existing API surface.
exports.createGuest = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You cannot modify this reservation.' });
    const guest = await Guest.create({ name: req.body.name, reservation: reservation._id });
    res.status(201).json(guest);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.getGuests = async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);
  if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
  if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You cannot view this reservation.' });
  const guests = await Guest.find({ reservation: reservation._id });
  res.json(guests);
};

exports.getGuest = async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId);
  if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
  if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You cannot view this reservation.' });
  const guest = await Guest.findOne({ _id: req.params.guestId, reservation: reservation._id });
  if (!guest) return res.status(404).json({ message: 'Guest not found' });
  res.json(guest);
};

exports.updateGuest = async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId);
  if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
  if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You cannot modify this reservation.' });
  const guest = await Guest.findOneAndUpdate({ _id: req.params.guestId, reservation: reservation._id }, { name: req.body.name }, { new: true, runValidators: true });
  if (!guest) return res.status(404).json({ message: 'Guest not found' });
  res.json(guest);
};

exports.deleteGuest = async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId);
  if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
  if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You cannot modify this reservation.' });
  const guest = await Guest.findOneAndDelete({ _id: req.params.guestId, reservation: reservation._id });
  if (!guest) return res.status(404).json({ message: 'Guest not found' });
  res.json({ message: 'Guest deleted successfully' });
};

exports.createInvoice = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (!ownsReservation(req, reservation) && !isAdmin(req)) return res.status(403).json({ message: 'You cannot access this reservation.' });
    const { amount, status } = req.body;
    const invoice = await Invoice.create({ reservation: reservation._id, amount, status });
    res.status(201).json(invoice);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.getInvoice = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (!ownsReservation(req, reservation)) return res.status(403).json({ message: 'You cannot access this reservation.' });
    const invoice = await Invoice.findOne({ reservation: reservation._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.updateInvoice = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    if (!isAdmin(req)) return res.status(403).json({ message: 'Administrator access is required.' });
    const updates = {};
    if (req.body.amount !== undefined) updates.amount = req.body.amount;
    if (req.body.status !== undefined) updates.status = req.body.status;
    const invoice = await Invoice.findOneAndUpdate({ reservation: reservation._id }, updates, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.deleteInvoice = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Administrator access is required.' });
    const invoice = await Invoice.findOneAndDelete({ reservation: req.params.id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) { res.status(400).json({ message: error.message }); }
};
