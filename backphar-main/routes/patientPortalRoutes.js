import express from "express";
import patientPortalController from "../controllers/patientPortalController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", patientPortalController.registerPatientPortalAccount);
router.get("/doctors", patientPortalController.searchPublicDoctors);
router.get("/doctors/:doctorId/availability", patientPortalController.getPublicDoctorAvailability);

router.get(
  "/provider-profile/me",
  authenticateToken,
  authorizeRoles("doctor", "secretaire"),
  patientPortalController.getProviderPublicProfile,
);
router.put(
  "/provider-profile/me",
  authenticateToken,
  authorizeRoles("doctor", "secretaire"),
  patientPortalController.updateProviderPublicProfile,
);

router.get(
  "/me",
  authenticateToken,
  authorizeRoles("pation"),
  patientPortalController.getMyPatientPortalProfile,
);
router.put(
  "/me",
  authenticateToken,
  authorizeRoles("pation"),
  patientPortalController.updateMyPatientPortalProfile,
);
router.get(
  "/appointments",
  authenticateToken,
  authorizeRoles("pation"),
  patientPortalController.getMyBookedAppointments,
);
router.post(
  "/appointments/book",
  authenticateToken,
  authorizeRoles("pation"),
  patientPortalController.bookAppointmentOnline,
);
router.get(
  "/ordonnances",
  authenticateToken,
  authorizeRoles("pation"),
  patientPortalController.getMyOrdonnances,
);
router.get(
  "/documents",
  authenticateToken,
  authorizeRoles("pation"),
  patientPortalController.getMyDocuments,
);

export default router;
