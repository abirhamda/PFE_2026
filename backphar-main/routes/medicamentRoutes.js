import express from 'express';
import medicamentController from '../controllers/medicamentController.js';

const router = express.Router();

// Route pour récupérer tous les médicaments
router.get('/', medicamentController.getAllMedicaments);

// Route pour mettre à jour la quantité (ex: diminution)
router.put('/:id/quantite', medicamentController.updateQuantite);
router.post('/demande/:pharmacyId', medicamentController.handleDemande);


export default router;
