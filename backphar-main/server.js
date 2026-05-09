import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import adminRoutes from './routes/adminRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ordonnanceRoutes from './routes/ordonnanceRoutes.js';
import medicamentRoutes from './routes/medicamentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import demandesRoutes from './routes/demandesRoutes.js';
import secretaryRoutes from './routes/secretaryRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import doctorPatientRoutes from './routes/doctorPatientRoutes.js';
import patientPortalRoutes from './routes/patientPortalRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/', userRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/ordonnances', ordonnanceRoutes);
app.use('/api/medicaments', medicamentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/demandes', demandesRoutes);
app.use('/api/secretaries', secretaryRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctor-patients', doctorPatientRoutes);
app.use('/api/patient-portal', patientPortalRoutes);

app.get('/', (req, res) => {
  res.send("Bienvenue sur l'API PharmaConnect");
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

server.on('error', (error) => {
  console.error('Server error:', error);
});
