-- Migration: Link patient_portal_profiles to the global patients registry
-- Run BEFORE deploying the updated backend controllers.
--
-- This adds patient_global_id to patient_portal_profiles so that a
-- self-registered patient account is always linked to the same canonical
-- patients row that the doctor/secretary uses. No duplicate patient records.

ALTER TABLE patient_portal_profiles
  ADD COLUMN patient_global_id INT NULL,
  ADD CONSTRAINT fk_patient_portal_profiles_global_patient
    FOREIGN KEY (patient_global_id) REFERENCES patients(id) ON DELETE SET NULL;

-- Back-fill existing portal profiles that have a CIN already present
-- in the patients table.
UPDATE patient_portal_profiles ppp
  INNER JOIN patients p ON p.cin = ppp.cin AND ppp.cin IS NOT NULL
SET ppp.patient_global_id = p.id
WHERE ppp.patient_global_id IS NULL;
