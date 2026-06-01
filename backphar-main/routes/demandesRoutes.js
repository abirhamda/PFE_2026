import express from "express";
import demandesController from "../controllers/demandesController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/test", demandesController.testConnection);
router.get("/pharmacie/:id", authenticateToken, authorizeRoles("admin", "pharmacist"), demandesController.getDemandesByPharmacie);
router.get("/me/pharmacy", authenticateToken, authorizeRoles("pharmacist"), demandesController.getMyDemandes);
router.get("/me/supplier", authenticateToken, authorizeRoles("supplier"), demandesController.getMySupplierDemandes);
router.put("/:id/status", authenticateToken, authorizeRoles("admin", "pharmacist", "supplier"), demandesController.updateDemandeStatus);
router.post("/create", authenticateToken, authorizeRoles("pharmacist"), demandesController.createDemande);

export default router;
