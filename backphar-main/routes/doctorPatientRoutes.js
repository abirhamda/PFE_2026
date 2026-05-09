import express from "express";
import doctorPatientController from "../controllers/doctorPatientController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken, authorizeRoles("doctor", "secretaire"));

router.get("/", doctorPatientController.listPatients);
router.post("/", doctorPatientController.createPatient);
router.get("/by-matricule/:matricule", doctorPatientController.getPatientByMatricule);
router.post("/:id/fiche-notes", doctorPatientController.createPatientFicheNote);
router.put("/:id/fiche-notes/:noteId", doctorPatientController.updatePatientFicheNote);
router.delete("/:id/fiche-notes/:noteId", doctorPatientController.deletePatientFicheNote);
router.get("/:id/fiche", doctorPatientController.getPatientFiche);
router.put("/:id", doctorPatientController.updatePatient);
router.delete("/:id", doctorPatientController.deletePatient);

export default router;
