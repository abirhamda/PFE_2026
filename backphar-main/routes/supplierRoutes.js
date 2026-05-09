import express from "express";
import supplierController from "../controllers/supplierController.js";

const router = express.Router();

router.post("/", supplierController.createSupplier);
router.get("/", supplierController.getAllSuppliers);

router.get("/:id/pharmacies", supplierController.getPharmaciesBySupplierId);
router.get("/:supplierId/pharmacies/demandes", supplierController.getPharmaciesWithDemandes);
router.post("/:supplierId/pharmacies/:pharmacyId", supplierController.addPharmacyToSupplier);

router.get("/:id", supplierController.getSupplier);
router.put("/:id", supplierController.updateSupplier);
router.put("/:id/status", supplierController.toggleStatus);
router.put("/:id/change-password", supplierController.changePassword);
router.delete("/:id", supplierController.deleteSupplier);

export default router;
