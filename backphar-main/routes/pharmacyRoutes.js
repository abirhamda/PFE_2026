import express from "express";
import pharmacyController from "../controllers/pharmacyController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const adminOnly = [authenticateToken, authorizeRoles("admin")];

router.get("/me", authenticateToken, authorizeRoles("pharmacist"), pharmacyController.getMyProfile);
router.put("/me/profile", authenticateToken, authorizeRoles("pharmacist"), pharmacyController.updateMyProfile);
router.put("/me/public-profile", authenticateToken, authorizeRoles("pharmacist"), pharmacyController.updatePublicProfile);
router.get("/me/dashboard", authenticateToken, authorizeRoles("pharmacist"), pharmacyController.getMyDashboard);

router.post("/", ...adminOnly, pharmacyController.createPharmacy);
router.get("/", ...adminOnly, pharmacyController.getAllPharmacies);
router.get("/public-search", pharmacyController.searchPublicPharmacies);
router.get("/:id", authenticateToken, pharmacyController.getProfile);
router.put("/:id", ...adminOnly, pharmacyController.updatePharmacy);
router.put("/:id/profile", authenticateToken, pharmacyController.updateProfile);
router.put("/:id/change-password", authenticateToken, pharmacyController.changePassword);
router.put("/:id/status", ...adminOnly, pharmacyController.togglePharmacyStatus);
router.delete("/:id", ...adminOnly, pharmacyController.deletePharmacy);

export default router;
