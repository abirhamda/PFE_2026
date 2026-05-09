import express from 'express';
import doctorController from '../controllers/doctorController.js';

const router = express.Router();

// Create and Read
router.post('/', doctorController.createDoctor);
router.get('/', doctorController.getAllDoctors);
router.get('/:id', doctorController.getProfile);

// Update
router.put('/:id', doctorController.updateProfile);
router.put('/:id/change-password', doctorController.changePassword);
router.put('/:id/status', doctorController.toggleDoctorStatus);

// Delete
router.delete('/:id', doctorController.deleteDoctor);

export default router;
