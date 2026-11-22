const express = require('express');
const router = express.Router();
const controller = require('../controllers/table.controller');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

// Read-only availability is public. Management is restricted to signed-in admins.
router.get('/capacity/:min', controller.getByCapacity);
router.get('/', controller.getAll);
router.get('/:id', controller.getOne);
router.post('/', authMiddleware, adminMiddleware, controller.create);
router.put('/:id', authMiddleware, adminMiddleware, controller.update);
router.delete('/capacity/:id', authMiddleware, adminMiddleware, controller.removeIfCapacityOK);
router.delete('/:id', authMiddleware, adminMiddleware, controller.remove);
router.delete('/', authMiddleware, adminMiddleware, controller.removeAll);

module.exports = router;
