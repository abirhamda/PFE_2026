-- Pharmaconnect Tunisia / Sousse seed
-- Purpose:
-- 1. remove older local test/demo accounts
-- 2. keep a replayable Sousse-oriented dataset
-- 3. seed realistic business and locality data for Sahloul, Khezama, Boujaafar, Hammam Sousse and Medina
-- 4. use application-owned login emails only (not third-party private mailboxes)
-- Shared password for all seeded accounts: Sousse2026!

SET NAMES utf8mb4;
SET @pwd_hash = '$2b$10$ifAVhPPmpVFTeoBcwRIJN.KcgMIVpLKu3Z2kYNURLdPVBzgG.U2kO';

SET @hours_morning = '{"0":{"enabled":false,"start":"09:00","end":"17:00"},"1":{"enabled":true,"start":"08:30","end":"13:00"},"2":{"enabled":true,"start":"08:30","end":"13:00"},"3":{"enabled":true,"start":"08:30","end":"13:00"},"4":{"enabled":true,"start":"08:30","end":"13:00"},"5":{"enabled":true,"start":"08:30","end":"12:30"},"6":{"enabled":true,"start":"09:00","end":"12:00"}}';
SET @hours_day = '{"0":{"enabled":false,"start":"09:00","end":"17:00"},"1":{"enabled":true,"start":"09:00","end":"17:00"},"2":{"enabled":true,"start":"09:00","end":"17:00"},"3":{"enabled":true,"start":"09:00","end":"17:00"},"4":{"enabled":true,"start":"09:00","end":"17:00"},"5":{"enabled":true,"start":"09:00","end":"13:00"},"6":{"enabled":false,"start":"09:00","end":"13:00"}}';
SET @hours_women = '{"0":{"enabled":false,"start":"09:00","end":"17:00"},"1":{"enabled":true,"start":"08:30","end":"14:00"},"2":{"enabled":true,"start":"08:30","end":"14:00"},"3":{"enabled":true,"start":"08:30","end":"14:00"},"4":{"enabled":true,"start":"08:30","end":"14:00"},"5":{"enabled":true,"start":"08:30","end":"12:30"},"6":{"enabled":false,"start":"09:00","end":"13:00"}}';

START TRANSACTION;

-- ----------------------------------
-- Resolve older demo/test accounts
-- ----------------------------------

SET @old_ph1 = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.test1@pharmaconnect.local' LIMIT 1);
SET @old_ph2 = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.test2@pharmaconnect.local' LIMIT 1);
SET @old_doc1 = (SELECT id FROM doctors WHERE email = 'doctor.test1@pharmaconnect.local' LIMIT 1);
SET @old_doc2 = (SELECT id FROM doctors WHERE email = 'doctor.test2@pharmaconnect.local' LIMIT 1);
SET @old_sup1 = (SELECT id FROM suppliers WHERE email = 'supplier.test1@pharmaconnect.local' LIMIT 1);
SET @old_sup2 = (SELECT id FROM suppliers WHERE email = 'supplier.test2@pharmaconnect.local' LIMIT 1);
SET @old_pat_user1 = (SELECT id FROM users WHERE email = 'pation.test1@pharmaconnect.local' LIMIT 1);
SET @old_pat_user2 = (SELECT id FROM users WHERE email = 'pation.test2@pharmaconnect.local' LIMIT 1);
SET @old_pat_profile1 = (SELECT id FROM patient_portal_profiles WHERE email = 'pation.test1@pharmaconnect.local' LIMIT 1);
SET @old_pat_profile2 = (SELECT id FROM patient_portal_profiles WHERE email = 'pation.test2@pharmaconnect.local' LIMIT 1);

-- ----------------------------------
-- Resolve current Tunisia/Sousse accounts for replay-safe cleanup
-- ----------------------------------

SET @seed_ph_sahloul = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.sahloul@pharmaconnect.tn' LIMIT 1);
SET @seed_ph_khezama = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.khezama@pharmaconnect.tn' LIMIT 1);
SET @seed_ph_boujaafar = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.boujaafar@pharmaconnect.tn' LIMIT 1);
SET @seed_ph_hammam = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.hammamsousse@pharmaconnect.tn' LIMIT 1);
SET @seed_ph_medina = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.medina@pharmaconnect.tn' LIMIT 1);

SET @seed_doc_amine = (SELECT id FROM doctors WHERE email = 'amine.jaziri@pharmaconnect.tn' LIMIT 1);
SET @seed_doc_manel = (SELECT id FROM doctors WHERE email = 'manel.triki@pharmaconnect.tn' LIMIT 1);
SET @seed_doc_riadh = (SELECT id FROM doctors WHERE email = 'riadh.benamor@pharmaconnect.tn' LIMIT 1);
SET @seed_doc_rim = (SELECT id FROM doctors WHERE email = 'rim.khlifi@pharmaconnect.tn' LIMIT 1);
SET @seed_doc_walid = (SELECT id FROM doctors WHERE email = 'walid.ghannouchi@pharmaconnect.tn' LIMIT 1);
SET @seed_doc_nesrine = (SELECT id FROM doctors WHERE email = 'nesrine.ayadi@pharmaconnect.tn' LIMIT 1);

SET @seed_sup_chaari = (SELECT id FROM suppliers WHERE email = 'meryem.chaari@pharmaconnect.tn' LIMIT 1);
SET @seed_sup_jlassi = (SELECT id FROM suppliers WHERE email = 'oussema.jlassi@pharmaconnect.tn' LIMIT 1);
SET @seed_sup_haddad = (SELECT id FROM suppliers WHERE email = 'imen.haddad@pharmaconnect.tn' LIMIT 1);
SET @seed_sup_belhadj = (SELECT id FROM suppliers WHERE email = 'nizar.belhadj@pharmaconnect.tn' LIMIT 1);

SET @seed_pat_user_malek = (SELECT id FROM users WHERE email = 'patient.malek@pharmaconnect.tn' LIMIT 1);
SET @seed_pat_user_sarra = (SELECT id FROM users WHERE email = 'patient.sarra@pharmaconnect.tn' LIMIT 1);
SET @seed_pat_user_youssef = (SELECT id FROM users WHERE email = 'patient.youssef@pharmaconnect.tn' LIMIT 1);
SET @seed_pat_user_meriem = (SELECT id FROM users WHERE email = 'patient.meriem@pharmaconnect.tn' LIMIT 1);

SET @seed_pat_profile_malek = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.malek@pharmaconnect.tn' LIMIT 1);
SET @seed_pat_profile_sarra = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.sarra@pharmaconnect.tn' LIMIT 1);
SET @seed_pat_profile_youssef = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.youssef@pharmaconnect.tn' LIMIT 1);
SET @seed_pat_profile_meriem = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.meriem@pharmaconnect.tn' LIMIT 1);

-- ----------------------------------
-- Cleanup relational data
-- ----------------------------------

DELETE FROM notifications
WHERE pharmacien_id IN (@old_ph1, @old_ph2, @seed_ph_sahloul, @seed_ph_khezama, @seed_ph_boujaafar, @seed_ph_hammam, @seed_ph_medina)
   OR fournisseur_id IN (@old_sup1, @old_sup2, @seed_sup_chaari, @seed_sup_jlassi, @seed_sup_haddad, @seed_sup_belhadj);

DELETE FROM demandes
WHERE pharmacie_id IN (@old_ph1, @old_ph2, @seed_ph_sahloul, @seed_ph_khezama, @seed_ph_boujaafar, @seed_ph_hammam, @seed_ph_medina)
   OR supplier_id IN (@old_sup1, @old_sup2, @seed_sup_chaari, @seed_sup_jlassi, @seed_sup_haddad, @seed_sup_belhadj);

DELETE FROM supplier_pharmacie
WHERE supplier_id IN (@old_sup1, @old_sup2, @seed_sup_chaari, @seed_sup_jlassi, @seed_sup_haddad, @seed_sup_belhadj)
   OR pharmacie_id IN (@old_ph1, @old_ph2, @seed_ph_sahloul, @seed_ph_khezama, @seed_ph_boujaafar, @seed_ph_hammam, @seed_ph_medina);

DELETE FROM medicaments_stock
WHERE id_pharmacie IN (@old_ph1, @old_ph2, @seed_ph_sahloul, @seed_ph_khezama, @seed_ph_boujaafar, @seed_ph_hammam, @seed_ph_medina);

DELETE FROM patient_fiche_notes
WHERE doctor_id IN (
  @old_doc1, @old_doc2,
  @seed_doc_amine, @seed_doc_manel, @seed_doc_riadh, @seed_doc_rim, @seed_doc_walid, @seed_doc_nesrine
);

DELETE FROM appointments
WHERE doctor_id IN (
  @old_doc1, @old_doc2,
  @seed_doc_amine, @seed_doc_manel, @seed_doc_riadh, @seed_doc_rim, @seed_doc_walid, @seed_doc_nesrine
)
   OR booked_by_patient_user_id IN (
     @old_pat_user1, @old_pat_user2,
     @seed_pat_user_malek, @seed_pat_user_sarra, @seed_pat_user_youssef, @seed_pat_user_meriem
   );

DELETE FROM waiting_room_counters
WHERE doctor_id IN (
  @old_doc1, @old_doc2,
  @seed_doc_amine, @seed_doc_manel, @seed_doc_riadh, @seed_doc_rim, @seed_doc_walid, @seed_doc_nesrine
);

DELETE FROM ordonnances
WHERE doctor_id IN (
  @old_doc1, @old_doc2,
  @seed_doc_amine, @seed_doc_manel, @seed_doc_riadh, @seed_doc_rim, @seed_doc_walid, @seed_doc_nesrine
)
   OR pation_id IN (
     @old_pat_profile1, @old_pat_profile2,
     @seed_pat_profile_malek, @seed_pat_profile_sarra, @seed_pat_profile_youssef, @seed_pat_profile_meriem
   );

DELETE FROM doctor_patients
WHERE doctor_id IN (
  @old_doc1, @old_doc2,
  @seed_doc_amine, @seed_doc_manel, @seed_doc_riadh, @seed_doc_rim, @seed_doc_walid, @seed_doc_nesrine
);

DELETE FROM doctor_public_profiles
WHERE doctor_id IN (@old_doc1, @old_doc2);

DELETE FROM secretaries
WHERE doctor_id IN (@old_doc1, @old_doc2)
   OR email IN (
     'secretaire.amine@pharmaconnect.tn',
     'secretaire.rim@pharmaconnect.tn',
     'secretaire.nesrine@pharmaconnect.tn'
   );

-- remove older local test accounts entirely
DELETE FROM patient_portal_profiles
WHERE email IN ('pation.test1@pharmaconnect.local', 'pation.test2@pharmaconnect.local');

DELETE FROM admin
WHERE email = 'admin.test@pharmaconnect.local';

DELETE FROM suppliers
WHERE email IN ('supplier.test1@pharmaconnect.local', 'supplier.test2@pharmaconnect.local');

DELETE FROM doctors
WHERE email IN ('doctor.test1@pharmaconnect.local', 'doctor.test2@pharmaconnect.local');

DELETE FROM pharmacie
WHERE email IN ('pharmacie.test1@pharmaconnect.local', 'pharmacie.test2@pharmaconnect.local');

DELETE FROM users
WHERE email IN (
  'admin.test@pharmaconnect.local',
  'supplier.test1@pharmaconnect.local',
  'supplier.test2@pharmaconnect.local',
  'doctor.test1@pharmaconnect.local',
  'doctor.test2@pharmaconnect.local',
  'pharmacie.test1@pharmaconnect.local',
  'pharmacie.test2@pharmaconnect.local',
  'pation.test1@pharmaconnect.local',
  'pation.test2@pharmaconnect.local'
);

-- ----------------------------------
-- Admin
-- ----------------------------------

INSERT INTO users (email, password, role)
VALUES ('admin.sousse@pharmaconnect.tn', @pwd_hash, 'admin')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO admin (full_name, email, mot_de_passe, phone, address)
VALUES (
  'Administration Pharmaconnect Sousse',
  'admin.sousse@pharmaconnect.tn',
  @pwd_hash,
  '73210400',
  'Avenue Habib Bourguiba, Sousse'
)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  mot_de_passe = VALUES(mot_de_passe),
  phone = VALUES(phone),
  address = VALUES(address);

-- ----------------------------------
-- Pharmacies
-- ----------------------------------

INSERT INTO users (email, password, role)
VALUES
  ('pharmacie.sahloul@pharmaconnect.tn', @pwd_hash, 'pharmacist'),
  ('pharmacie.khezama@pharmaconnect.tn', @pwd_hash, 'pharmacist'),
  ('pharmacie.boujaafar@pharmaconnect.tn', @pwd_hash, 'pharmacist'),
  ('pharmacie.hammamsousse@pharmaconnect.tn', @pwd_hash, 'pharmacist'),
  ('pharmacie.medina@pharmaconnect.tn', @pwd_hash, 'pharmacist')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO pharmacie (nom_pharmacie, email, telephone, mot_de_passe, president_pharmacie, address_line, city, is_active)
VALUES
  ('Pharmacie Sahloul 1', 'pharmacie.sahloul@pharmaconnect.tn', '73227510', @pwd_hash, 'Hela Trabelsi', 'Rue Sahloul 1, pres de l hopital Sahloul', 'Sousse', 1),
  ('Pharmacie Khezama Est', 'pharmacie.khezama@pharmaconnect.tn', '73228120', @pwd_hash, 'Mohamed Gharbi', 'Avenue Yasser Arafet, Khezama Est', 'Sousse', 1),
  ('Pharmacie Boujaafar', 'pharmacie.boujaafar@pharmaconnect.tn', '73203470', @pwd_hash, 'Olfa Jebali', 'Boulevard du 14 Janvier, Boujaafar', 'Sousse', 1),
  ('Pharmacie Hammam Sousse', 'pharmacie.hammamsousse@pharmaconnect.tn', '73891340', @pwd_hash, 'Sami Ben Romdhane', 'Avenue de la Republique, Hammam Sousse', 'Hammam Sousse', 1),
  ('Pharmacie Medina Sousse', 'pharmacie.medina@pharmaconnect.tn', '73232880', @pwd_hash, 'Marwa Ben Amor', 'Rue de la Medina, centre historique', 'Sousse', 1)
ON DUPLICATE KEY UPDATE
  nom_pharmacie = VALUES(nom_pharmacie),
  telephone = VALUES(telephone),
  mot_de_passe = VALUES(mot_de_passe),
  president_pharmacie = VALUES(president_pharmacie),
  address_line = VALUES(address_line),
  city = VALUES(city),
  is_active = VALUES(is_active);

UPDATE pharmacie
SET address_line = 'Rue Sahloul 1, pres de l hopital Sahloul', city = 'Sousse'
WHERE email = 'pharmacie.sahloul@pharmaconnect.tn';

UPDATE pharmacie
SET address_line = 'Avenue Yasser Arafet, Khezama Est', city = 'Sousse'
WHERE email = 'pharmacie.khezama@pharmaconnect.tn';

UPDATE pharmacie
SET address_line = 'Boulevard du 14 Janvier, Boujaafar', city = 'Sousse'
WHERE email = 'pharmacie.boujaafar@pharmaconnect.tn';

UPDATE pharmacie
SET address_line = 'Avenue de la Republique, Hammam Sousse', city = 'Hammam Sousse'
WHERE email = 'pharmacie.hammamsousse@pharmaconnect.tn';

UPDATE pharmacie
SET address_line = 'Rue de la Medina, centre historique', city = 'Sousse'
WHERE email = 'pharmacie.medina@pharmaconnect.tn';

SET @ph_sahloul = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.sahloul@pharmaconnect.tn' LIMIT 1);
SET @ph_khezama = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.khezama@pharmaconnect.tn' LIMIT 1);
SET @ph_boujaafar = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.boujaafar@pharmaconnect.tn' LIMIT 1);
SET @ph_hammam = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.hammamsousse@pharmaconnect.tn' LIMIT 1);
SET @ph_medina = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.medina@pharmaconnect.tn' LIMIT 1);

-- ----------------------------------
-- Doctors
-- ----------------------------------

INSERT INTO users (email, cin, password, role)
VALUES
  ('amine.jaziri@pharmaconnect.tn', '11000001', @pwd_hash, 'doctor'),
  ('manel.triki@pharmaconnect.tn', '11000002', @pwd_hash, 'doctor'),
  ('riadh.benamor@pharmaconnect.tn', '11000003', @pwd_hash, 'doctor'),
  ('rim.khlifi@pharmaconnect.tn', '11000004', @pwd_hash, 'doctor'),
  ('walid.ghannouchi@pharmaconnect.tn', '11000005', @pwd_hash, 'doctor'),
  ('nesrine.ayadi@pharmaconnect.tn', '11000006', @pwd_hash, 'doctor')
ON DUPLICATE KEY UPDATE
  cin = VALUES(cin),
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO doctors (nom, prenom, email, password, cin, specialty, is_active)
VALUES
  ('Jaziri', 'Amine', 'amine.jaziri@pharmaconnect.tn', @pwd_hash, '11000001', 'Cardiologie', 1),
  ('Triki', 'Manel', 'manel.triki@pharmaconnect.tn', @pwd_hash, '11000002', 'Pediatrie', 1),
  ('Ben Amor', 'Riadh', 'riadh.benamor@pharmaconnect.tn', @pwd_hash, '11000003', 'Dermatologie', 1),
  ('Khlifi', 'Rim', 'rim.khlifi@pharmaconnect.tn', @pwd_hash, '11000004', 'Gynecologie obstetrique', 1),
  ('Ghannouchi', 'Walid', 'walid.ghannouchi@pharmaconnect.tn', @pwd_hash, '11000005', 'Medecine generale', 1),
  ('Ayadi', 'Nesrine', 'nesrine.ayadi@pharmaconnect.tn', @pwd_hash, '11000006', 'Ophtalmologie', 1)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  password = VALUES(password),
  cin = VALUES(cin),
  specialty = VALUES(specialty),
  is_active = VALUES(is_active);

SET @doc_amine = (SELECT id FROM doctors WHERE email = 'amine.jaziri@pharmaconnect.tn' LIMIT 1);
SET @doc_manel = (SELECT id FROM doctors WHERE email = 'manel.triki@pharmaconnect.tn' LIMIT 1);
SET @doc_riadh = (SELECT id FROM doctors WHERE email = 'riadh.benamor@pharmaconnect.tn' LIMIT 1);
SET @doc_rim = (SELECT id FROM doctors WHERE email = 'rim.khlifi@pharmaconnect.tn' LIMIT 1);
SET @doc_walid = (SELECT id FROM doctors WHERE email = 'walid.ghannouchi@pharmaconnect.tn' LIMIT 1);
SET @doc_nesrine = (SELECT id FROM doctors WHERE email = 'nesrine.ayadi@pharmaconnect.tn' LIMIT 1);

INSERT INTO doctor_public_profiles (
  doctor_id,
  display_name,
  public_phone,
  address_line,
  city,
  latitude,
  longitude,
  consultation_fee,
  consultation_duration_min,
  working_hours_json,
  bio,
  online_visibility,
  online_booking_enabled
)
VALUES
  (
    @doc_amine,
    'Dr Amine Jaziri',
    '73330110',
    'Rue de la Sante, Sahloul 1',
    'Sousse',
    35.8332000,
    10.5944000,
    70.00,
    20,
    @hours_morning,
    'Cardiologue oriente suivi adulte et prevention cardiovasculaire.',
    1,
    1
  ),
  (
    @doc_manel,
    'Dr Manel Triki',
    '73330120',
    'Avenue Yasser Arafet, Khezama Est',
    'Sousse',
    35.8361000,
    10.6155000,
    55.00,
    20,
    @hours_morning,
    'Pediatre pour nourrissons, enfants et suivi vaccinal.',
    1,
    1
  ),
  (
    @doc_riadh,
    'Dr Riadh Ben Amor',
    '73330130',
    'Boulevard du 14 Janvier, Boujaafar',
    'Sousse',
    35.8309000,
    10.6415000,
    60.00,
    25,
    @hours_day,
    'Dermatologue axe consultation cutanee et suivi acne et eczema.',
    1,
    1
  ),
  (
    @doc_rim,
    'Dr Rim Khlifi',
    '73330140',
    'Avenue de la Republique, Hammam Sousse',
    'Hammam Sousse',
    35.8608000,
    10.6010000,
    65.00,
    25,
    @hours_women,
    'Gynecologue obstetricienne pour suivi de grossesse et consultation de proximite.',
    1,
    1
  ),
  (
    @doc_walid,
    'Dr Walid Ghannouchi',
    '73330150',
    'Rue Ibn El Jazzar, Medina de Sousse',
    'Sousse',
    35.8248000,
    10.6349000,
    45.00,
    15,
    @hours_morning,
    'Medecin generaliste pour suivi familial et pathologies courantes.',
    1,
    1
  ),
  (
    @doc_nesrine,
    'Dr Nesrine Ayadi',
    '73330160',
    'Khezama Est, pres de la zone 14 Janvier',
    'Sousse',
    35.8401000,
    10.6290000,
    80.00,
    25,
    @hours_day,
    'Ophtalmologue pour consultation de la vue et suivi des pathologies oculaires.',
    1,
    1
  )
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  public_phone = VALUES(public_phone),
  address_line = VALUES(address_line),
  city = VALUES(city),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  consultation_fee = VALUES(consultation_fee),
  consultation_duration_min = VALUES(consultation_duration_min),
  working_hours_json = VALUES(working_hours_json),
  bio = VALUES(bio),
  online_visibility = VALUES(online_visibility),
  online_booking_enabled = VALUES(online_booking_enabled);

-- ----------------------------------
-- Secretaries
-- ----------------------------------

INSERT INTO users (email, password, role)
VALUES
  ('secretaire.amine@pharmaconnect.tn', @pwd_hash, 'secretaire'),
  ('secretaire.rim@pharmaconnect.tn', @pwd_hash, 'secretaire'),
  ('secretaire.nesrine@pharmaconnect.tn', @pwd_hash, 'secretaire')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO secretaries (doctor_id, nom, prenom, email, password, telephone, is_active, created_at)
VALUES
  (@doc_amine, 'Bouazizi', 'Ines', 'secretaire.amine@pharmaconnect.tn', @pwd_hash, '98100101', 1, NOW()),
  (@doc_rim, 'Ben Said', 'Sabrine', 'secretaire.rim@pharmaconnect.tn', @pwd_hash, '98100102', 1, NOW()),
  (@doc_nesrine, 'Jallouli', 'Aya', 'secretaire.nesrine@pharmaconnect.tn', @pwd_hash, '98100103', 1, NOW())
ON DUPLICATE KEY UPDATE
  doctor_id = VALUES(doctor_id),
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  password = VALUES(password),
  telephone = VALUES(telephone),
  is_active = VALUES(is_active);

SET @sec_amine = (SELECT id FROM secretaries WHERE email = 'secretaire.amine@pharmaconnect.tn' LIMIT 1);
SET @sec_rim = (SELECT id FROM secretaries WHERE email = 'secretaire.rim@pharmaconnect.tn' LIMIT 1);
SET @sec_nesrine = (SELECT id FROM secretaries WHERE email = 'secretaire.nesrine@pharmaconnect.tn' LIMIT 1);

-- ----------------------------------
-- Suppliers
-- ----------------------------------

INSERT INTO users (email, password, role)
VALUES
  ('meryem.chaari@pharmaconnect.tn', @pwd_hash, 'supplier'),
  ('oussema.jlassi@pharmaconnect.tn', @pwd_hash, 'supplier'),
  ('imen.haddad@pharmaconnect.tn', @pwd_hash, 'supplier'),
  ('nizar.belhadj@pharmaconnect.tn', @pwd_hash, 'supplier')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO suppliers (nom, prenom, email, password, telephone, is_active)
VALUES
  ('Chaari', 'Meryem', 'meryem.chaari@pharmaconnect.tn', @pwd_hash, '73441110', 1),
  ('Jlassi', 'Oussema', 'oussema.jlassi@pharmaconnect.tn', @pwd_hash, '73441120', 1),
  ('Haddad', 'Imen', 'imen.haddad@pharmaconnect.tn', @pwd_hash, '73441130', 1),
  ('Belhadj', 'Nizar', 'nizar.belhadj@pharmaconnect.tn', @pwd_hash, '73441140', 1)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  password = VALUES(password),
  telephone = VALUES(telephone),
  is_active = VALUES(is_active);

SET @sup_chaari = (SELECT id FROM suppliers WHERE email = 'meryem.chaari@pharmaconnect.tn' LIMIT 1);
SET @sup_jlassi = (SELECT id FROM suppliers WHERE email = 'oussema.jlassi@pharmaconnect.tn' LIMIT 1);
SET @sup_haddad = (SELECT id FROM suppliers WHERE email = 'imen.haddad@pharmaconnect.tn' LIMIT 1);
SET @sup_belhadj = (SELECT id FROM suppliers WHERE email = 'nizar.belhadj@pharmaconnect.tn' LIMIT 1);

-- ----------------------------------
-- Supplier / pharmacy relations
-- ----------------------------------

INSERT IGNORE INTO supplier_pharmacie (supplier_id, pharmacie_id)
VALUES
  (@sup_chaari, @ph_sahloul),
  (@sup_chaari, @ph_khezama),
  (@sup_jlassi, @ph_boujaafar),
  (@sup_jlassi, @ph_hammam),
  (@sup_haddad, @ph_medina),
  (@sup_haddad, @ph_sahloul),
  (@sup_belhadj, @ph_khezama),
  (@sup_belhadj, @ph_medina),
  (@sup_belhadj, @ph_hammam);

-- ----------------------------------
-- Patient portal accounts
-- ----------------------------------

INSERT INTO users (email, cin, password, role)
VALUES
  ('patient.malek@pharmaconnect.tn', '13000001', @pwd_hash, 'pation'),
  ('patient.sarra@pharmaconnect.tn', '13000002', @pwd_hash, 'pation'),
  ('patient.youssef@pharmaconnect.tn', '13000003', @pwd_hash, 'pation'),
  ('patient.meriem@pharmaconnect.tn', '13000004', @pwd_hash, 'pation')
ON DUPLICATE KEY UPDATE
  cin = VALUES(cin),
  password = VALUES(password),
  role = VALUES(role);

SET @pat_user_malek = (SELECT id FROM users WHERE email = 'patient.malek@pharmaconnect.tn' LIMIT 1);
SET @pat_user_sarra = (SELECT id FROM users WHERE email = 'patient.sarra@pharmaconnect.tn' LIMIT 1);
SET @pat_user_youssef = (SELECT id FROM users WHERE email = 'patient.youssef@pharmaconnect.tn' LIMIT 1);
SET @pat_user_meriem = (SELECT id FROM users WHERE email = 'patient.meriem@pharmaconnect.tn' LIMIT 1);

INSERT INTO patient_portal_profiles (
  user_id, nom, prenom, email, telephone, cin, date_naissance, city, latitude, longitude, is_active, created_at, updated_at
)
VALUES
  (@pat_user_malek, 'Gharbi', 'Malek', 'patient.malek@pharmaconnect.tn', '28100101', '13000001', '1991-03-14', 'Sousse', 35.8331000, 10.5960000, 1, NOW(), NOW()),
  (@pat_user_sarra, 'Ben Hmida', 'Sarra', 'patient.sarra@pharmaconnect.tn', '28100102', '13000002', '1994-07-22', 'Hammam Sousse', 35.8613000, 10.6030000, 1, NOW(), NOW()),
  (@pat_user_youssef, 'Jallouli', 'Youssef', 'patient.youssef@pharmaconnect.tn', '28100103', '13000003', '1988-11-09', 'Sousse', 35.8384000, 10.6240000, 1, NOW(), NOW()),
  (@pat_user_meriem, 'Ben Salem', 'Meriem', 'patient.meriem@pharmaconnect.tn', '28100104', '13000004', '1996-01-30', 'Sousse', 35.8270000, 10.6360000, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  telephone = VALUES(telephone),
  cin = VALUES(cin),
  date_naissance = VALUES(date_naissance),
  city = VALUES(city),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  is_active = VALUES(is_active),
  updated_at = NOW();

SET @pat_profile_malek = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.malek@pharmaconnect.tn' LIMIT 1);
SET @pat_profile_sarra = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.sarra@pharmaconnect.tn' LIMIT 1);
SET @pat_profile_youssef = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.youssef@pharmaconnect.tn' LIMIT 1);
SET @pat_profile_meriem = (SELECT id FROM patient_portal_profiles WHERE email = 'patient.meriem@pharmaconnect.tn' LIMIT 1);

-- ----------------------------------
-- Global patients
-- ----------------------------------

INSERT INTO patients (nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
VALUES
  ('Gharbi', 'Malek', '13000001', '28100101', '1991-03-14', NOW(), NOW()),
  ('Ben Hmida', 'Sarra', '13000002', '28100102', '1994-07-22', NOW(), NOW()),
  ('Jallouli', 'Youssef', '13000003', '28100103', '1988-11-09', NOW(), NOW()),
  ('Ben Salem', 'Meriem', '13000004', '28100104', '1996-01-30', NOW(), NOW()),
  ('Krichen', 'Ahmed', '13000005', '28100105', '1979-09-17', NOW(), NOW()),
  ('Bousnina', 'Rania', '13000006', '28100106', '1985-05-06', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  telephone = VALUES(telephone),
  date_naissance = VALUES(date_naissance),
  updated_at = NOW();

SET @global_malek = (SELECT id FROM patients WHERE cin = '13000001' LIMIT 1);
SET @global_sarra = (SELECT id FROM patients WHERE cin = '13000002' LIMIT 1);
SET @global_youssef = (SELECT id FROM patients WHERE cin = '13000003' LIMIT 1);
SET @global_meriem = (SELECT id FROM patients WHERE cin = '13000004' LIMIT 1);
SET @global_ahmed = (SELECT id FROM patients WHERE cin = '13000005' LIMIT 1);
SET @global_rania = (SELECT id FROM patients WHERE cin = '13000006' LIMIT 1);

-- ----------------------------------
-- Doctor patients
-- ----------------------------------

INSERT INTO doctor_patients (
  doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at
)
VALUES
  (@doc_amine, @global_malek, 'PAT-A01', 'Gharbi', 'Malek', '13000001', '28100101', '1991-03-14', NOW(), NOW()),
  (@doc_amine, @global_ahmed, 'PAT-A02', 'Krichen', 'Ahmed', '13000005', '28100105', '1979-09-17', NOW(), NOW()),
  (@doc_manel, @global_sarra, 'PAT-M01', 'Ben Hmida', 'Sarra', '13000002', '28100102', '1994-07-22', NOW(), NOW()),
  (@doc_manel, @global_rania, 'PAT-M02', 'Bousnina', 'Rania', '13000006', '28100106', '1985-05-06', NOW(), NOW()),
  (@doc_riadh, @global_youssef, 'PAT-R01', 'Jallouli', 'Youssef', '13000003', '28100103', '1988-11-09', NOW(), NOW()),
  (@doc_rim, @global_meriem, 'PAT-G01', 'Ben Salem', 'Meriem', '13000004', '28100104', '1996-01-30', NOW(), NOW()),
  (@doc_rim, @global_rania, 'PAT-G02', 'Bousnina', 'Rania', '13000006', '28100106', '1985-05-06', NOW(), NOW()),
  (@doc_walid, @global_malek, 'PAT-W01', 'Gharbi', 'Malek', '13000001', '28100101', '1991-03-14', NOW(), NOW()),
  (@doc_walid, @global_ahmed, 'PAT-W02', 'Krichen', 'Ahmed', '13000005', '28100105', '1979-09-17', NOW(), NOW()),
  (@doc_nesrine, @global_sarra, 'PAT-N01', 'Ben Hmida', 'Sarra', '13000002', '28100102', '1994-07-22', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  patient_global_id = VALUES(patient_global_id),
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  telephone = VALUES(telephone),
  date_naissance = VALUES(date_naissance),
  updated_at = NOW();

SET @dp_amine_malek = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_amine AND matricule = 'PAT-A01' LIMIT 1);
SET @dp_amine_ahmed = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_amine AND matricule = 'PAT-A02' LIMIT 1);
SET @dp_manel_sarra = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_manel AND matricule = 'PAT-M01' LIMIT 1);
SET @dp_manel_rania = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_manel AND matricule = 'PAT-M02' LIMIT 1);
SET @dp_riadh_youssef = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_riadh AND matricule = 'PAT-R01' LIMIT 1);
SET @dp_rim_meriem = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_rim AND matricule = 'PAT-G01' LIMIT 1);
SET @dp_rim_rania = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_rim AND matricule = 'PAT-G02' LIMIT 1);
SET @dp_walid_malek = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_walid AND matricule = 'PAT-W01' LIMIT 1);
SET @dp_walid_ahmed = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_walid AND matricule = 'PAT-W02' LIMIT 1);
SET @dp_nesrine_sarra = (SELECT id FROM doctor_patients WHERE doctor_id = @doc_nesrine AND matricule = 'PAT-N01' LIMIT 1);

-- ----------------------------------
-- Appointments
-- ----------------------------------

INSERT INTO appointments (
  doctor_id, secretary_id, patient_id, booked_by_patient_user_id, patient_matricule, patient_nom, patient_prenom,
  patient_cin, patient_phone, patient_date_naissance,
  appointment_at, payment_amount, payment_doctor_comment, doctor_notes, created_by_role, created_at, updated_at
)
VALUES
  (@doc_amine, @sec_amine, @dp_amine_malek, @pat_user_malek, 'PAT-A01', 'Gharbi', 'Malek', '13000001', '28100101', '1991-03-14', TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 18 DAY), '09:00:00'), 70.00, 'Paiement regle en caisse.', 'Suivi tension arterielle et bilan lipidique recommande.', 'secretaire', NOW(), NOW()),
  (@doc_amine, NULL, @dp_amine_ahmed, NULL, 'PAT-A02', 'Krichen', 'Ahmed', '13000005', '28100105', '1979-09-17', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '09:20:00'), NULL, NULL, 'Controle de suivi cardiovasculaire a faire.', 'doctor', NOW(), NOW()),
  (@doc_manel, NULL, @dp_manel_sarra, @pat_user_sarra, 'PAT-M01', 'Ben Hmida', 'Sarra', '13000002', '28100102', '1994-07-22', TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 12 DAY), '10:00:00'), 55.00, 'A regler a la prochaine consultation pediatrique.', 'Suivi vaccin et controle croissance.', 'doctor', NOW(), NOW()),
  (@doc_manel, NULL, @dp_manel_rania, NULL, 'PAT-M02', 'Bousnina', 'Rania', '13000006', '28100106', '1985-05-06', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:20:00'), NULL, NULL, 'Consultation de suivi programmee.', 'doctor', NOW(), NOW()),
  (@doc_riadh, NULL, @dp_riadh_youssef, @pat_user_youssef, 'PAT-R01', 'Jallouli', 'Youssef', '13000003', '28100103', '1988-11-09', TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 9 DAY), '15:00:00'), 60.00, 'Paiement complet.', 'Traitement local conseille pour dermatite.', 'doctor', NOW(), NOW()),
  (@doc_riadh, NULL, @dp_riadh_youssef, @pat_user_youssef, 'PAT-R01', 'Jallouli', 'Youssef', '13000003', '28100103', '1988-11-09', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '15:25:00'), NULL, NULL, 'Controle lesion cutanee et tolerance traitement.', 'doctor', NOW(), NOW()),
  (@doc_rim, @sec_rim, @dp_rim_meriem, @pat_user_meriem, 'PAT-G01', 'Ben Salem', 'Meriem', '13000004', '28100104', '1996-01-30', TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 15 DAY), '08:30:00'), 65.00, 'Paiement en espece confirme.', 'Suivi gynecologique regulier.', 'secretaire', NOW(), NOW()),
  (@doc_rim, NULL, @dp_rim_rania, NULL, 'PAT-G02', 'Bousnina', 'Rania', '13000006', '28100106', '1985-05-06', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '09:20:00'), NULL, NULL, 'Controle complementaire programme.', 'doctor', NOW(), NOW()),
  (@doc_walid, NULL, @dp_walid_malek, @pat_user_malek, 'PAT-W01', 'Gharbi', 'Malek', '13000001', '28100101', '1991-03-14', TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '11:00:00'), 45.00, 'Ticket regle.', 'Traitement symptomatique et repos.', 'doctor', NOW(), NOW()),
  (@doc_walid, NULL, @dp_walid_ahmed, NULL, 'PAT-W02', 'Krichen', 'Ahmed', '13000005', '28100105', '1979-09-17', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:15:00'), NULL, NULL, 'Controle tension et glycémie.', 'doctor', NOW(), NOW()),
  (@doc_nesrine, @sec_nesrine, @dp_nesrine_sarra, @pat_user_sarra, 'PAT-N01', 'Ben Hmida', 'Sarra', '13000002', '28100102', '1994-07-22', TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '16:00:00'), NULL, NULL, 'Bilan visuel et secheresse oculaire.', 'secretaire', NOW(), NOW());

-- ----------------------------------
-- Free fiche notes
-- ----------------------------------

INSERT INTO patient_fiche_notes (
  doctor_id, patient_id, entry_at, doctor_notes, payment_amount, payment_doctor_comment, created_at, updated_at
)
VALUES
  (@doc_amine, @dp_amine_malek, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 18 DAY), '09:15:00'), 'Patient stable. Regime pauvre en sel conseille.', 70.00, 'Reglement effectue.', NOW(), NOW()),
  (@doc_rim, @dp_rim_meriem, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 15 DAY), '08:55:00'), 'Aucun signe d alerte. Revoir dans 6 mois.', 65.00, 'Paiement confirme.', NOW(), NOW()),
  (@doc_walid, @dp_walid_ahmed, TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '11:20:00'), 'Controle clinique satisfaisant.', 45.00, 'Regle en totalite.', NOW(), NOW());

-- ----------------------------------
-- Ordonnances
-- ----------------------------------

INSERT INTO ordonnances (doctor_id, id_doctor, pation_id, cin, nom, prenom, ordonnance, status)
VALUES
  (@doc_amine, @doc_amine, @pat_profile_malek, '13000001', 'Gharbi', 'Malek', 'Amlodipine 5mg, 1 cp le soir pendant 30 jours. Bilan lipidique dans 1 mois.', 'Validee'),
  (@doc_manel, @doc_manel, @pat_profile_sarra, '13000002', 'Ben Hmida', 'Sarra', 'Paracetamol sirop pediatrique si fievre, surveillance hydratation et repos.', 'En attente'),
  (@doc_riadh, @doc_riadh, @pat_profile_youssef, '13000003', 'Jallouli', 'Youssef', 'Creme emolliente matin et soir pendant 14 jours. Eviter les irritants cutanes.', 'Validee'),
  (@doc_rim, @doc_rim, @pat_profile_meriem, '13000004', 'Ben Salem', 'Meriem', 'Fer et acide folique 1 cp par jour pendant 3 mois.', 'Validee');

-- ----------------------------------
-- Waiting room counters
-- ----------------------------------

INSERT INTO waiting_room_counters (doctor_id, counter_date, waiting_count)
VALUES
  (@doc_amine, CURDATE(), 4),
  (@doc_manel, CURDATE(), 3),
  (@doc_riadh, CURDATE(), 2),
  (@doc_rim, CURDATE(), 5),
  (@doc_walid, CURDATE(), 4),
  (@doc_nesrine, CURDATE(), 2)
ON DUPLICATE KEY UPDATE
  waiting_count = VALUES(waiting_count),
  updated_at = NOW();

-- ----------------------------------
-- Pharmacy stock
-- ----------------------------------

INSERT INTO medicaments_stock (id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at)
VALUES
  (@ph_sahloul, 'Paracetamol 1g', 95, 2.80, 20, NOW(), NOW()),
  (@ph_sahloul, 'Amlodipine 5mg', 36, 9.90, 10, NOW(), NOW()),
  (@ph_sahloul, 'Omeprazole 20mg', 50, 6.20, 12, NOW(), NOW()),
  (@ph_sahloul, 'Ventoline inhaler', 12, 16.50, 5, NOW(), NOW()),
  (@ph_khezama, 'Collyre lubricifiant', 24, 13.50, 8, NOW(), NOW()),
  (@ph_khezama, 'Larmes artificielles', 18, 14.20, 8, NOW(), NOW()),
  (@ph_khezama, 'Paracetamol 1g', 70, 2.90, 15, NOW(), NOW()),
  (@ph_khezama, 'Ibuprofene 400mg', 42, 4.60, 12, NOW(), NOW()),
  (@ph_boujaafar, 'Spasfon', 55, 5.90, 10, NOW(), NOW()),
  (@ph_boujaafar, 'Ibuprofene 400mg', 64, 4.70, 12, NOW(), NOW()),
  (@ph_boujaafar, 'Omeprazole 20mg', 22, 6.40, 10, NOW(), NOW()),
  (@ph_hammam, 'Metformine 850mg', 48, 7.10, 12, NOW(), NOW()),
  (@ph_hammam, 'Fer et acide folique', 16, 11.40, 8, NOW(), NOW()),
  (@ph_hammam, 'Paracetamol 1g', 80, 2.80, 15, NOW(), NOW()),
  (@ph_medina, 'Amoxicilline 1g', 28, 8.50, 10, NOW(), NOW()),
  (@ph_medina, 'Vitamine D3', 34, 10.80, 10, NOW(), NOW()),
  (@ph_medina, 'Metformine 850mg', 40, 7.20, 12, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  quantite = VALUES(quantite),
  prix = VALUES(prix),
  seuil_alerte = VALUES(seuil_alerte),
  updated_at = NOW();

-- ----------------------------------
-- Pharmacy requests and notifications
-- ----------------------------------

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, response_note, date_acceptation, created_at, updated_at)
VALUES (@ph_sahloul, @sup_chaari, 'Paracetamol 1g', 40, 'en_attente', 'Besoin de reapprovisionnement hebdomadaire.', NULL, NOW(), NOW());
SET @dem_sahloul = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
VALUES ('Paracetamol 1g', 40, @ph_sahloul, @sup_chaari, 'Nouvelle demande de la Pharmacie Sahloul 1.', 'en_attente', @dem_sahloul, NOW());

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, response_note, date_acceptation, created_at, updated_at)
VALUES (@ph_khezama, @sup_belhadj, 'Larmes artificielles', 15, 'acceptee', 'Livraison prevue sous 48 heures.', NOW(), NOW(), NOW());
SET @dem_khezama = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
VALUES ('Larmes artificielles', 15, @ph_khezama, @sup_belhadj, 'Demande acceptee pour la Pharmacie Khezama Est.', 'acceptee', @dem_khezama, NOW());

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, response_note, date_acceptation, created_at, updated_at)
VALUES (@ph_boujaafar, @sup_jlassi, 'Ibuprofene 400mg', 30, 'recue', 'Reception confirmee par la pharmacie.', NOW(), NOW(), NOW());
SET @dem_boujaafar = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
VALUES ('Ibuprofene 400mg', 30, @ph_boujaafar, @sup_jlassi, 'Demande recue et cloturee.', 'recue', @dem_boujaafar, NOW());

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, response_note, date_acceptation, created_at, updated_at)
VALUES (@ph_hammam, @sup_haddad, 'Fer et acide folique', 25, 'refusee', 'Stock fournisseur insuffisant pour cette semaine.', NULL, NOW(), NOW());
SET @dem_hammam = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
VALUES ('Fer et acide folique', 25, @ph_hammam, @sup_haddad, 'Demande refusee, stock indisponible.', 'refusee', @dem_hammam, NOW());

COMMIT;

SELECT 'Seed Tunisia / Sousse applique. Mot de passe commun: Sousse2026!' AS info;

SELECT email, role
FROM users
WHERE email IN (
  'admin.sousse@pharmaconnect.tn',
  'pharmacie.sahloul@pharmaconnect.tn',
  'pharmacie.khezama@pharmaconnect.tn',
  'pharmacie.boujaafar@pharmaconnect.tn',
  'pharmacie.hammamsousse@pharmaconnect.tn',
  'pharmacie.medina@pharmaconnect.tn',
  'amine.jaziri@pharmaconnect.tn',
  'manel.triki@pharmaconnect.tn',
  'riadh.benamor@pharmaconnect.tn',
  'rim.khlifi@pharmaconnect.tn',
  'walid.ghannouchi@pharmaconnect.tn',
  'nesrine.ayadi@pharmaconnect.tn',
  'secretaire.amine@pharmaconnect.tn',
  'secretaire.rim@pharmaconnect.tn',
  'secretaire.nesrine@pharmaconnect.tn',
  'meryem.chaari@pharmaconnect.tn',
  'oussema.jlassi@pharmaconnect.tn',
  'imen.haddad@pharmaconnect.tn',
  'nizar.belhadj@pharmaconnect.tn',
  'patient.malek@pharmaconnect.tn',
  'patient.sarra@pharmaconnect.tn',
  'patient.youssef@pharmaconnect.tn',
  'patient.meriem@pharmaconnect.tn'
)
ORDER BY role, email;
