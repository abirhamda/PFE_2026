import express from "express";
import secretaryController from "../controllers/secretaryController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticateToken, authorizeRoles("secretaire"), secretaryController.getMyProfile);
router.get(
  "/doctor/:doctorId",
  authenticateToken,
  authorizeRoles("doctor", "admin"),
  secretaryController.getDoctorSecretaries,
);
router.post("/", authenticateToken, authorizeRoles("doctor", "admin"), secretaryController.createSecretary);
router.put("/:id", authenticateToken, authorizeRoles("doctor", "admin"), secretaryController.updateSecretary);
router.put(
  "/:id/status",
  authenticateToken,
  authorizeRoles("doctor", "admin"),
  secretaryController.toggleSecretaryStatus,
);
router.delete("/:id", authenticateToken, authorizeRoles("doctor", "admin"), secretaryController.deleteSecretary);

export default router;
