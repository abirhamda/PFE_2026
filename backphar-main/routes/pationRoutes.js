import express from 'express';
import pationController from '../controllers/pationController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', authenticateToken, authorizeRoles('pation'), pationController.getMyProfile);
router.get('/me/ordonnances', authenticateToken, authorizeRoles('pation'), pationController.getMyOrdonnances);

router.post('/', authenticateToken, authorizeRoles('admin'), pationController.createPation);
router.get('/', authenticateToken, authorizeRoles('admin'), pationController.getAllPations);
router.get('/:id/ordonnances', authenticateToken, authorizeRoles('admin', 'doctor', 'pation'), pationController.getPationOrdonnances);
router.get('/:id', authenticateToken, authorizeRoles('admin'), pationController.getPationById);
router.put('/:id', authenticateToken, authorizeRoles('admin'), pationController.updatePation);
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), pationController.togglePationStatus);
router.put('/:id/change-password', authenticateToken, authorizeRoles('admin', 'pation'), pationController.changePationPassword);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), pationController.deletePation);

export default router;
