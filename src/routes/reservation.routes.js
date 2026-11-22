const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', reservationController.createReservation);
router.get('/', reservationController.getReservations);
router.patch('/:id/cancel', reservationController.cancelReservation);

// Guest routes
router.post('/:id/guests', reservationController.createGuest);
router.get('/:id/guests', reservationController.getGuests);
router.get('/:reservationId/guests/:guestId', reservationController.getGuest);
router.put('/:reservationId/guests/:guestId', reservationController.updateGuest);
router.delete('/:reservationId/guests/:guestId', reservationController.deleteGuest);

// Invoice routes
router.post('/:id/invoice', reservationController.createInvoice);
router.get('/:id/invoice', reservationController.getInvoice);
router.put('/:id/invoice', adminMiddleware, reservationController.updateInvoice);
router.delete('/:id/invoice', adminMiddleware, reservationController.deleteInvoice);

module.exports = router;
