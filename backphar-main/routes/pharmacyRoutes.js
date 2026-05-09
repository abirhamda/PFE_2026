import express from 'express';
import pharmacyController from '../controllers/pharmacyController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

const adminOnly = [authenticateToken, authorizeRoles('admin')];

router.post('/', ...adminOnly, pharmacyController.createPharmacy);
router.get('/', ...adminOnly, pharmacyController.getAllPharmacies);
router.get('/:id', authenticateToken, pharmacyController.getProfile);
router.put('/:id', ...adminOnly, pharmacyController.updatePharmacy);
router.put('/:id/profile', authenticateToken, pharmacyController.updateProfile);
router.put('/:id/change-password', authenticateToken, pharmacyController.changePassword);
router.put('/:id/status', ...adminOnly, pharmacyController.togglePharmacyStatus);
router.delete('/:id', ...adminOnly, pharmacyController.deletePharmacy);

export default router;
