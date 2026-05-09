import express from "express";
import ordonnanceController from "../controllers/ordonnanceController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles("doctor", "secretaire", "pharmacist", "admin"), ordonnanceController.getAllOrdonnances);
router.get("/:id", authenticateToken, authorizeRoles("doctor", "secretaire", "pharmacist", "admin"), ordonnanceController.getOrdonnanceById);
router.post("/", authenticateToken, authorizeRoles("doctor"), ordonnanceController.createOrdonnance);
router.put("/:id/status", authenticateToken, authorizeRoles("pharmacist", "admin"), ordonnanceController.updateStatus);
router.put("/:id", authenticateToken, authorizeRoles("doctor"), ordonnanceController.updateOrdonnance);
router.delete("/:id", authenticateToken, authorizeRoles("doctor"), ordonnanceController.deleteOrdonnance);

export default router;
