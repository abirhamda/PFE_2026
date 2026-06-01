import express from 'express';
import doctorController from '../controllers/doctorController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create and Read
router.post('/', authenticateToken, authorizeRoles('admin'), doctorController.createDoctor);
router.get('/', doctorController.getAllDoctors);
router.get('/:id', doctorController.getProfile);

// Update
router.put('/:id', authenticateToken, authorizeRoles('admin'), doctorController.updateProfile);
router.put('/:id/change-password', authenticateToken, authorizeRoles('admin', 'doctor'), doctorController.changePassword);
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), doctorController.toggleDoctorStatus);

// Delete
router.delete('/:id', authenticateToken, authorizeRoles('admin'), doctorController.deleteDoctor);

export default router;
