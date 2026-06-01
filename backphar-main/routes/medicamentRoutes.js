import express from "express";
import medicamentController from "../controllers/medicamentController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles("admin", "pharmacist"), medicamentController.getAllMedicaments);
router.post("/me", authenticateToken, authorizeRoles("pharmacist"), medicamentController.createMedicament);
router.put("/:id", authenticateToken, authorizeRoles("pharmacist"), medicamentController.updateMedicament);
router.put("/:id/quantite", authenticateToken, authorizeRoles("pharmacist"), medicamentController.updateQuantite);
router.patch("/:id/adjust", authenticateToken, authorizeRoles("pharmacist"), medicamentController.adjustQuantite);
router.delete("/:id", authenticateToken, authorizeRoles("pharmacist"), medicamentController.deleteMedicament);

export default router;
