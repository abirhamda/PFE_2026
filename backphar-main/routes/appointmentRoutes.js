import express from "express";
import appointmentController from "../controllers/appointmentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/calendar",
  authenticateToken,
  authorizeRoles("doctor", "secretaire"),
  appointmentController.getCalendarAppointments,
);
router.get(
  "/waiting-room",
  authenticateToken,
  authorizeRoles("doctor", "secretaire"),
  appointmentController.getWaitingRoomCounter,
);
router.put(
  "/waiting-room",
  authenticateToken,
  authorizeRoles("secretaire"),
  appointmentController.setWaitingRoomCounter,
);
router.post(
  "/waiting-room/adjust",
  authenticateToken,
  authorizeRoles("secretaire"),
  appointmentController.adjustWaitingRoomCounter,
);
router.post("/", authenticateToken, authorizeRoles("doctor", "secretaire"), appointmentController.createAppointment);
router.put("/:id", authenticateToken, authorizeRoles("doctor", "secretaire"), appointmentController.updateAppointment);
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("doctor", "secretaire"),
  appointmentController.deleteAppointment,
);
router.get(
  "/:id/fiche",
  authenticateToken,
  authorizeRoles("doctor", "secretaire"),
  appointmentController.getAppointmentFiche,
);

export default router;
