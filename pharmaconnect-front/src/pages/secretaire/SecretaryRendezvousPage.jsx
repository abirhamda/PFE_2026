import React from "react";
import RendezvousCalendarBoard from "../../components/appointments/RendezvousCalendarBoard";

const SecretaryRendezvousPage = () => (
  <RendezvousCalendarBoard
    title="Gestion des rendez-vous"
    subtitle=""
    canManageAppointments={true}
    canAdjustWaitingCount={true}
  />
);

export default SecretaryRendezvousPage;
