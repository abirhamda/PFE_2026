import express from "express";
import supplierController from "../controllers/supplierController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticateToken, authorizeRoles("supplier"), supplierController.getMyProfile);
router.put("/me/profile", authenticateToken, authorizeRoles("supplier"), supplierController.updateMyProfile);
router.get("/me/dashboard", authenticateToken, authorizeRoles("supplier"), supplierController.getMyDashboard);
router.get("/me/request-center", authenticateToken, authorizeRoles("supplier"), supplierController.getMyRequestCenter);

router.post("/", authenticateToken, authorizeRoles("admin", "pharmacist"), supplierController.createSupplier);
router.get("/", authenticateToken, authorizeRoles("admin", "pharmacist"), supplierController.getAllSuppliers);

router.get("/:id/pharmacies", authenticateToken, authorizeRoles("admin", "supplier"), supplierController.getPharmaciesBySupplierId);
router.get(
  "/:supplierId/pharmacies/demandes",
  authenticateToken,
  authorizeRoles("admin", "supplier"),
  supplierController.getPharmaciesWithDemandes,
);
router.post(
  "/:supplierId/pharmacies/:pharmacyId",
  authenticateToken,
  authorizeRoles("admin", "pharmacist"),
  supplierController.addPharmacyToSupplier,
);

router.get("/:id", authenticateToken, authorizeRoles("admin", "pharmacist", "supplier"), supplierController.getSupplier);
router.put("/:id", authenticateToken, authorizeRoles("admin", "pharmacist"), supplierController.updateSupplier);
router.put("/:id/status", authenticateToken, authorizeRoles("admin", "pharmacist"), supplierController.toggleStatus);
router.put("/:id/change-password", authenticateToken, authorizeRoles("admin", "supplier"), supplierController.changePassword);
router.delete("/:id", authenticateToken, authorizeRoles("admin", "pharmacist"), supplierController.deleteSupplier);

export default router;
