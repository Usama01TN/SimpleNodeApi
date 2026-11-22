const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Public account access
router.post('/signup', controller.signUp);
router.post('/signin', controller.signIn);

// Every account-management endpoint requires a valid, non-revoked JWT.
router.post('/logout', authMiddleware, controller.logout);
router.get('/', authMiddleware, controller.getAll);
router.get('/getByEmail/:email', authMiddleware, controller.getUserByEmail);
router.get('/:id', authMiddleware, controller.getById);
router.put('/:id', authMiddleware, controller.update);
router.delete('/:id', authMiddleware, controller.remove);

module.exports = router;
