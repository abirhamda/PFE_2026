import React from "react";
import RendezvousCalendarBoard from "../../components/appointments/RendezvousCalendarBoard";

const DoctorRendezvousPage = () => (
  <RendezvousCalendarBoard
    title="Agenda des rendez-vous"
    subtitle="Supervision des rendez-vous secretaire/medecin avec fiches patients."
    canManageAppointments={true}
    canAdjustWaitingCount={false}
  />
);

export default DoctorRendezvousPage;
