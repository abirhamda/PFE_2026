import express from 'express';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Routes pour les notifications
router.get("/fournisseur/:fournisseurId", notificationController.getNotificationsByFournisseur)
router.put("/update-status/:id", notificationController.updateNotificationStatus)
router.post("/", notificationController.createNotification)
router.get("/", notificationController.getAllNotifications)

export default router;
