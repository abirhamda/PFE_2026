import express from "express";
import supplierProductController from "../controllers/supplierProductController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticateToken, authorizeRoles("supplier"), supplierProductController.getMyProducts);
router.post("/me", authenticateToken, authorizeRoles("supplier"), supplierProductController.createProduct);
router.put("/:id", authenticateToken, authorizeRoles("supplier"), supplierProductController.updateProduct);
router.delete("/:id", authenticateToken, authorizeRoles("supplier"), supplierProductController.deleteProduct);

export default router;
