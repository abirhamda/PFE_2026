-- MediCare test seed (all roles + linked demo data)
-- Target DB from .env: application_medicale
-- Plain password for all test accounts: Test@123

USE application_medicale;

SET NAMES utf8mb4;
SET @pwd_hash = '$2b$10$V.GYFTM9oY8dj.K4lQiwq.KI1OZp93l6/wFApZhL/fVG.en4s.AkW';

-- ----------------------------
-- Core role accounts
-- ----------------------------

INSERT INTO users (email, password, role)
VALUES
  ('admin.test@pharmaconnect.local', @pwd_hash, 'admin')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO admin (full_name, email, mot_de_passe, phone, address)
VALUES
  ('Admin Test', 'admin.test@pharmaconnect.local', @pwd_hash, '0600000001', 'HQ MediCare')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  mot_de_passe = VALUES(mot_de_passe),
  phone = VALUES(phone),
  address = VALUES(address);

INSERT INTO users (email, password, role)
VALUES
  ('pharmacie.test1@pharmaconnect.local', @pwd_hash, 'pharmacist'),
  ('pharmacie.test2@pharmaconnect.local', @pwd_hash, 'pharmacist')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO pharmacie (nom_pharmacie, email, telephone, mot_de_passe, president_pharmacie, is_active)
VALUES
  ('Pharmacie Centrale', 'pharmacie.test1@pharmaconnect.local', '0611111111', @pwd_hash, 'Youssef Karim', 1),
  ('Pharmacie du Centre', 'pharmacie.test2@pharmaconnect.local', '0622222222', @pwd_hash, 'Salma Idrissi', 1)
ON DUPLICATE KEY UPDATE
  nom_pharmacie = VALUES(nom_pharmacie),
  telephone = VALUES(telephone),
  mot_de_passe = VALUES(mot_de_passe),
  president_pharmacie = VALUES(president_pharmacie),
  is_active = VALUES(is_active);

INSERT INTO users (email, password, role)
VALUES
  ('doctor.test1@pharmaconnect.local', @pwd_hash, 'doctor'),
  ('doctor.test2@pharmaconnect.local', @pwd_hash, 'doctor')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO doctors (nom, prenom, email, password, cin, specialty, is_active)
VALUES
  ('Benali', 'Adam', 'doctor.test1@pharmaconnect.local', @pwd_hash, 'DOC000001', 'Cardiologie', 1),
  ('Alaoui', 'Nour', 'doctor.test2@pharmaconnect.local', @pwd_hash, 'DOC000002', 'Dermatologie', 1)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  password = VALUES(password),
  cin = VALUES(cin),
  specialty = VALUES(specialty),
  is_active = VALUES(is_active);

INSERT INTO users (email, password, role)
VALUES
  ('supplier.test1@pharmaconnect.local', @pwd_hash, 'supplier'),
  ('supplier.test2@pharmaconnect.local', @pwd_hash, 'supplier')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

INSERT INTO suppliers (nom, prenom, email, password, telephone, is_active)
VALUES
  ('Fournier', 'Sami', 'supplier.test1@pharmaconnect.local', @pwd_hash, '0633333333', 1),
  ('Marchand', 'Lina', 'supplier.test2@pharmaconnect.local', @pwd_hash, '0644444444', 1)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  password = VALUES(password),
  telephone = VALUES(telephone),
  is_active = VALUES(is_active);

INSERT INTO users (email, password, role)
VALUES
  ('pation.test1@pharmaconnect.local', @pwd_hash, 'pation'),
  ('pation.test2@pharmaconnect.local', @pwd_hash, 'pation')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role);

SET @patUser1 = (SELECT id FROM users WHERE email = 'pation.test1@pharmaconnect.local' LIMIT 1);
SET @patUser2 = (SELECT id FROM users WHERE email = 'pation.test2@pharmaconnect.local' LIMIT 1);

INSERT INTO patient_portal_profiles (user_id, nom, prenom, email, telephone, cin, date_naissance, is_active)
VALUES
  (@patUser1, 'Rahmani', 'Omar', 'pation.test1@pharmaconnect.local', '0655555555', 'PAT000001', '1998-04-14', 1),
  (@patUser2, 'Amrani', 'Hana', 'pation.test2@pharmaconnect.local', '0666666666', 'PAT000002', '2001-11-03', 1)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  prenom = VALUES(prenom),
  telephone = VALUES(telephone),
  cin = VALUES(cin),
  date_naissance = VALUES(date_naissance),
  is_active = VALUES(is_active);

-- ----------------------------
-- Resolve IDs
-- ----------------------------

SET @ph1  = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.test1@pharmaconnect.local' LIMIT 1);
SET @ph2  = (SELECT id_pharmacie FROM pharmacie WHERE email = 'pharmacie.test2@pharmaconnect.local' LIMIT 1);
SET @doc1 = (SELECT id FROM doctors WHERE email = 'doctor.test1@pharmaconnect.local' LIMIT 1);
SET @doc2 = (SELECT id FROM doctors WHERE email = 'doctor.test2@pharmaconnect.local' LIMIT 1);
SET @sup1 = (SELECT id FROM suppliers WHERE email = 'supplier.test1@pharmaconnect.local' LIMIT 1);
SET @sup2 = (SELECT id FROM suppliers WHERE email = 'supplier.test2@pharmaconnect.local' LIMIT 1);
SET @pat1 = (SELECT id FROM patient_portal_profiles WHERE user_id = @patUser1 LIMIT 1);
SET @pat2 = (SELECT id FROM patient_portal_profiles WHERE user_id = @patUser2 LIMIT 1);
SET @pat1_cin = (SELECT cin FROM patient_portal_profiles WHERE id = @pat1 LIMIT 1);
SET @pat2_cin = (SELECT cin FROM patient_portal_profiles WHERE id = @pat2 LIMIT 1);
SET @pat1_nom = (SELECT nom FROM patient_portal_profiles WHERE id = @pat1 LIMIT 1);
SET @pat1_prenom = (SELECT prenom FROM patient_portal_profiles WHERE id = @pat1 LIMIT 1);
SET @pat2_nom = (SELECT nom FROM patient_portal_profiles WHERE id = @pat2 LIMIT 1);
SET @pat2_prenom = (SELECT prenom FROM patient_portal_profiles WHERE id = @pat2 LIMIT 1);

-- ----------------------------
-- Reset demo relational rows for these test accounts
-- ----------------------------

DELETE FROM notifications WHERE pharmacien_id IN (@ph1, @ph2) OR fournisseur_id IN (@sup1, @sup2);
DELETE FROM demandes WHERE pharmacie_id IN (@ph1, @ph2) OR supplier_id IN (@sup1, @sup2);
DELETE FROM medicaments_stock WHERE id_pharmacie IN (@ph1, @ph2);
DELETE FROM supplier_pharmacie WHERE supplier_id IN (@sup1, @sup2) OR pharmacie_id IN (@ph1, @ph2);
DELETE FROM ordonnances WHERE doctor_id IN (@doc1, @doc2) OR pation_id IN (@pat1, @pat2);

-- ----------------------------
-- Supplier <-> Pharmacy links
-- ----------------------------

INSERT IGNORE INTO supplier_pharmacie (supplier_id, pharmacie_id)
VALUES
  (@sup1, @ph1),
  (@sup1, @ph2),
  (@sup2, @ph2);

-- ----------------------------
-- Pation ordonnances
-- ----------------------------

INSERT INTO ordonnances (doctor_id, id_doctor, pation_id, cin, nom, prenom, ordonnance, status)
VALUES
  (
    @doc1, @doc1, @pat1, @pat1_cin, @pat1_nom, @pat1_prenom,
    'Paracetamol 1g, 1 comprime matin/soir pendant 5 jours.',
    'En attente'
  ),
  (
    @doc2, @doc2, @pat2, @pat2_cin, @pat2_nom, @pat2_prenom,
    'Creme dermatologique, application locale 2 fois par jour pendant 7 jours.',
    'Validee'
  );

-- ----------------------------
-- Pharmacy stock
-- ----------------------------

INSERT INTO medicaments_stock (id_pharmacie, nom, quantite, prix)
VALUES
  (@ph1, 'Paracetamol 1g', 80, 2.50),
  (@ph1, 'Amoxicilline 500mg', 40, 5.90),
  (@ph2, 'Ibuprofene 400mg', 60, 3.10)
ON DUPLICATE KEY UPDATE
  quantite = VALUES(quantite),
  prix = VALUES(prix);

-- ----------------------------
-- Demandes + notifications supplier
-- ----------------------------

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, date_acceptation)
VALUES (@ph1, @sup1, 'Paracetamol 1g', 30, 'en_attente', NULL);
SET @dem1 = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id)
VALUES ('Paracetamol 1g', 30, @ph1, @sup1, 'Nouvelle demande en attente', 'en_attente', @dem1);

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, date_acceptation)
VALUES (@ph2, @sup2, 'Ibuprofene 400mg', 20, 'acceptee', NOW());
SET @dem2 = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id)
VALUES ('Ibuprofene 400mg', 20, @ph2, @sup2, 'Demande acceptee', 'acceptee', @dem2);

INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, date_acceptation)
VALUES (@ph2, @sup1, 'Amoxicilline 500mg', 25, 'recue', NOW());
SET @dem3 = LAST_INSERT_ID();

INSERT INTO notifications (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id)
VALUES ('Amoxicilline 500mg', 25, @ph2, @sup1, 'Demande recue', 'recue', @dem3);

-- ----------------------------
-- Quick check output
-- ----------------------------

SELECT 'Password for all accounts: Test@123' AS info;

SELECT email, role
FROM users
WHERE email IN (
  'admin.test@pharmaconnect.local',
  'pharmacie.test1@pharmaconnect.local',
  'pharmacie.test2@pharmaconnect.local',
  'doctor.test1@pharmaconnect.local',
  'doctor.test2@pharmaconnect.local',
  'supplier.test1@pharmaconnect.local',
  'supplier.test2@pharmaconnect.local',
  'pation.test1@pharmaconnect.local',
  'pation.test2@pharmaconnect.local'
)
ORDER BY role, email;
