-- Safe patch migration (non-destructive)
-- Creates only missing columns and can be re-run multiple times.

USE application_medicale;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS demande_id INT NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE pharmacie
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE pharmacie
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE medicaments_stock
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE ordonnances
  ADD COLUMN IF NOT EXISTS doctor_id INT NULL;

ALTER TABLE ordonnances
  ADD COLUMN IF NOT EXISTS pation_id INT NULL;

UPDATE ordonnances
SET doctor_id = id_doctor
WHERE doctor_id IS NULL
  AND id_doctor IS NOT NULL;
