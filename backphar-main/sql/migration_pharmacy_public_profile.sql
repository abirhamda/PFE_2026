-- Migration: Add public profile fields to pharmacie table
-- Run this after the initial schema (pharmaconnect_schema.sql)
ALTER TABLE pharmacie
  ADD COLUMN pharmacy_type ENUM('day', 'night', 'both') NOT NULL DEFAULT 'day',
  ADD COLUMN opening_hours_json TEXT NULL,
  ADD COLUMN latitude DECIMAL(10,7) NULL,
  ADD COLUMN longitude DECIMAL(10,7) NULL;
