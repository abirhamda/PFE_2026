import express from 'express';
import demandesController from '../controllers/demandesController.js';

const router = express.Router();

// AJOUTEZ JUSTE CETTE LIGNE
router.get("/test", demandesController.testConnection)

// Vos routes existantes
router.get("/pharmacie/:id", demandesController.getDemandesByPharmacie)
router.put("/:id/status", demandesController.updateDemandeStatus)
router.post("/create", demandesController.createDemande)

export default router;
