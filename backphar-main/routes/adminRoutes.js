import express from "express";
import adminController from "../controllers/adminController.js";
import doctorController from "../controllers/doctorController.js";
import pharmacyController from "../controllers/pharmacyController.js";
import supplierController from "../controllers/supplierController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken, authorizeRoles("admin"));

// Pharmacy routes
router.post("/pharmacies", adminController.addPharmacy);
router.get("/pharmacies", adminController.getAllPharmacies);
router.put("/pharmacies/:id", pharmacyController.updatePharmacy);
router.delete("/pharmacies/:id", adminController.deletePharmacy);
router.put("/pharmacies/:id/status", adminController.togglePharmacyStatus);
router.get("/pharmacies/:id", adminController.getPharmacyDetails);

// Doctor routes
router.post("/doctors", doctorController.createDoctor);
router.get("/doctors", doctorController.getAllDoctors);
router.put("/doctors/:id", doctorController.updateDoctor);
router.delete("/doctors/:id", doctorController.deleteDoctor);
router.put("/doctors/:id/status", doctorController.toggleDoctorStatus);
router.get("/doctors/:id", doctorController.getProfile);

// Supplier routes
router.post("/suppliers", supplierController.createSupplier);
router.get("/suppliers", supplierController.getAllSuppliers);
router.put("/suppliers/:id", supplierController.updateSupplier);
router.delete("/suppliers/:id", supplierController.deleteSupplier);
router.put("/suppliers/:id/status", supplierController.toggleStatus);
router.get("/suppliers/:id", supplierController.getSupplier);

// Admin profile routes
router.get("/:id", adminController.getAdminProfile);
router.put("/:id", adminController.updateAdminProfile);
router.put("/:id/change-password", adminController.changeAdminPassword);

export default router;
