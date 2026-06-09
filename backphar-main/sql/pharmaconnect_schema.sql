-- MediCare unified schema (roles: admin, pharmacist, doctor, supplier, pation, secretaire)
-- Compatible with MySQL 8+

CREATE DATABASE IF NOT EXISTS application_medicale CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE application_medicale;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS rendez_vous;
DROP VIEW IF EXISTS medecins_patients;
DROP VIEW IF EXISTS medecins;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS demandes;
DROP TABLE IF EXISTS supplier_partnership_requests;
DROP TABLE IF EXISTS supplier_pharmacie;
DROP TABLE IF EXISTS supplier_products;
DROP TABLE IF EXISTS pharmacy_ordonnance_views;
DROP TABLE IF EXISTS medicaments_stock;
DROP TABLE IF EXISTS patient_documents;
DROP TABLE IF EXISTS waiting_room_counters;
DROP TABLE IF EXISTS patient_fiche_notes;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_patients;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS doctor_public_profiles;
DROP TABLE IF EXISTS ordonnances;
DROP TABLE IF EXISTS secretaries;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patient_portal_profiles;
DROP TABLE IF EXISTS pharmacie;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS password_reset_codes;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  cin VARCHAR(30) NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'pharmacist', 'doctor', 'supplier', 'pation', 'secretaire') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_cin (cin)
) ENGINE=InnoDB;

CREATE TABLE password_reset_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used_at DATETIME NULL,
  request_ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_password_reset_codes_user_active (user_id, used_at, expires_at),
  INDEX idx_password_reset_codes_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE patient_portal_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  telephone VARCHAR(30) NULL,
  cin VARCHAR(30) NULL,
  date_naissance DATE NULL,
  city VARCHAR(120) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_portal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_patient_portal_profiles_cin (cin),
  INDEX idx_patient_portal_city (city)
) ENGINE=InnoDB;

CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pharmacie (
  id_pharmacie INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nom_pharmacie VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  telephone VARCHAR(30) NOT NULL,
  president_pharmacie VARCHAR(120) NOT NULL,
  address_line VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  pharmacy_type ENUM('day','night','both') NOT NULL DEFAULT 'day',
  opening_hours_json TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pharmacie_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  cin VARCHAR(30) NOT NULL UNIQUE,
  specialty VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  cin VARCHAR(30) NULL,
  telephone VARCHAR(30) NULL,
  date_naissance DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patients_cin (cin),
  INDEX idx_patients_identity (nom, prenom, date_naissance)
) ENGINE=InnoDB;

CREATE TABLE doctor_public_profiles (
  doctor_id INT PRIMARY KEY,
  display_name VARCHAR(160) NULL,
  public_phone VARCHAR(30) NULL,
  address_line VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  consultation_fee DECIMAL(10,2) NULL,
  consultation_duration_min INT NOT NULL DEFAULT 20,
  working_hours_json TEXT NULL,
  bio TEXT NULL,
  online_visibility TINYINT(1) NOT NULL DEFAULT 0,
  online_booking_enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_public_profile_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_doctor_public_city (city),
  INDEX idx_doctor_public_online (online_visibility, online_booking_enabled)
) ENGINE=InnoDB;

CREATE TABLE secretaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  doctor_id INT NOT NULL,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  telephone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_secretaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_secretaries_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_secretaries_doctor (doctor_id)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  telephone VARCHAR(30) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_suppliers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ordonnances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NULL,
  doctor_patient_id INT NULL,
  cin VARCHAR(30) NULL,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  ordonnance TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'En attente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ordonnances_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_ordonnances_doctor_patient FOREIGN KEY (doctor_patient_id) REFERENCES doctor_patients(id) ON DELETE SET NULL,
  INDEX idx_ordonnances_doctor (doctor_id),
  INDEX idx_ordonnances_doctor_patient (doctor_patient_id),
  INDEX idx_ordonnances_cin (cin)
) ENGINE=InnoDB;

CREATE TABLE doctor_patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  patient_global_id INT NULL,
  matricule VARCHAR(30) NOT NULL,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  cin VARCHAR(30) NULL,
  telephone VARCHAR(30) NULL,
  date_naissance DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_patients_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctor_patients_global_patient FOREIGN KEY (patient_global_id) REFERENCES patients(id) ON DELETE SET NULL,
  UNIQUE KEY uq_doctor_patients_doctor_cin (doctor_id, cin),
  UNIQUE KEY uq_doctor_patients_matricule (doctor_id, matricule),
  INDEX idx_doctor_patients_name (doctor_id, nom, prenom)
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  secretary_id INT NULL,
  patient_id INT NULL,
  portal_patient_id INT NULL,
  booked_by_patient_user_id INT NULL,
  patient_matricule VARCHAR(30) NULL,
  patient_nom VARCHAR(120) NULL,
  patient_prenom VARCHAR(120) NULL,
  patient_cin VARCHAR(30) NULL,
  patient_phone VARCHAR(30) NULL,
  patient_date_naissance DATE NULL,
  appointment_at DATETIME NOT NULL,
  payment_amount DECIMAL(10,2) NULL,
  payment_doctor_comment TEXT NULL,
  doctor_notes TEXT NULL,
  created_by_role ENUM('doctor', 'secretaire', 'pation') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_secretary FOREIGN KEY (secretary_id) REFERENCES secretaries(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES doctor_patients(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_portal_patient FOREIGN KEY (portal_patient_id) REFERENCES patient_portal_profiles(id) ON DELETE SET NULL,
  INDEX idx_appointments_doctor_date (doctor_id, appointment_at),
  INDEX idx_appointments_patient (patient_id),
  INDEX idx_appointments_portal_patient (portal_patient_id, appointment_at)
) ENGINE=InnoDB;

CREATE TABLE patient_fiche_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  patient_id INT NOT NULL,
  entry_at DATETIME NOT NULL,
  doctor_notes TEXT NULL,
  payment_amount DECIMAL(10,2) NULL,
  payment_doctor_comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_fiche_notes_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_patient_fiche_notes_patient FOREIGN KEY (patient_id) REFERENCES doctor_patients(id) ON DELETE CASCADE,
  INDEX idx_patient_fiche_notes_lookup (doctor_id, patient_id, entry_at)
) ENGINE=InnoDB;

CREATE TABLE waiting_room_counters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  counter_date DATE NOT NULL,
  waiting_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_waiting_room_counters_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_waiting_room_counters_date (doctor_id, counter_date)
) ENGINE=InnoDB;

CREATE TABLE medicaments_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pharmacie INT NOT NULL,
  nom VARCHAR(140) NOT NULL,
  quantite INT NOT NULL DEFAULT 0,
  prix DECIMAL(10,2) NULL,
  seuil_alerte INT NOT NULL DEFAULT 10,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_pharmacie FOREIGN KEY (id_pharmacie) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  UNIQUE KEY uq_stock_pharmacie_nom (id_pharmacie, nom)
) ENGINE=InnoDB;

CREATE TABLE supplier_pharmacie (
  supplier_id INT NOT NULL,
  pharmacie_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, pharmacie_id),
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_pharmacie FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE supplier_partnership_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pharmacie_id INT NOT NULL,
  supplier_id INT NOT NULL,
  message TEXT NULL,
  status ENUM('en_attente', 'acceptee', 'refusee') NOT NULL DEFAULT 'en_attente',
  response_note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  CONSTRAINT fk_partnership_requests_pharmacie FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  CONSTRAINT fk_partnership_requests_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_partnership_requests_pair (pharmacie_id, supplier_id),
  INDEX idx_partnership_requests_supplier_status (supplier_id, status),
  INDEX idx_partnership_requests_pharmacy_status (pharmacie_id, status)
) ENGINE=InnoDB;

CREATE TABLE demandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pharmacie_id INT NOT NULL,
  supplier_id INT NOT NULL,
  nom_medicament VARCHAR(140) NOT NULL,
  quantite INT NOT NULL,
  status ENUM('en_attente', 'acceptee', 'recue', 'non_livree', 'refusee') NOT NULL DEFAULT 'en_attente',
  response_note TEXT NULL,
  date_acceptation DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_demandes_pharmacie FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  CONSTRAINT fk_demandes_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_demandes_status (status),
  INDEX idx_demandes_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom_medicament VARCHAR(140) NOT NULL,
  quantite INT NOT NULL,
  pharmacien_id INT NOT NULL,
  fournisseur_id INT NOT NULL,
  message TEXT NULL,
  status ENUM('en_attente', 'acceptee', 'refusee', 'recue') NOT NULL DEFAULT 'en_attente',
  demande_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_pharmacie FOREIGN KEY (pharmacien_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_supplier FOREIGN KEY (fournisseur_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_demande FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE SET NULL,
  INDEX idx_notifications_fournisseur (fournisseur_id),
  INDEX idx_notifications_status (status)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW rendez_vous AS
SELECT * FROM appointments;

CREATE OR REPLACE VIEW medecins_patients AS
SELECT * FROM doctor_patients;

CREATE OR REPLACE VIEW medecins AS
SELECT * FROM doctors;

-- Optional seed admin (replace hashed password before production)
-- INSERT INTO users (email, password, role) VALUES ('admin@medicare.local', '$2a$10$replace_me_with_bcrypt_hash', 'admin');
-- INSERT INTO admin (user_id, full_name, email, phone, address)
-- VALUES (LAST_INSERT_ID(), 'System Admin', 'admin@medicare.local', NULL, NULL);
