import express from "express";
import partnershipController from "../controllers/partnershipController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/directory", authenticateToken, authorizeRoles("pharmacist"), partnershipController.getSupplierDirectoryForPharmacy);
router.post("/requests", authenticateToken, authorizeRoles("pharmacist"), partnershipController.createPartnershipRequest);
router.get("/requests/incoming", authenticateToken, authorizeRoles("supplier"), partnershipController.getIncomingPartnershipRequests);
router.put("/requests/:id/respond", authenticateToken, authorizeRoles("supplier"), partnershipController.respondToPartnershipRequest);

export default router;
