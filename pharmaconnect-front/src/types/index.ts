// Type definitions for the PharmaConnect application

// User roles
export enum UserRole {
  ADMIN = 'ADMIN',
  PHARMACY = 'PHARMACY',
  DOCTOR = 'DOCTOR',
  SUPPLIER = 'SUPPLIER',
  STAFF = 'STAFF'
}

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

// Authentication related types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Pharmacy related types
export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  licenseNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyStaff {
  id: string;
  userId: string;
  pharmacyId: string;
  role: 'MANAGER' | 'PHARMACIST' | 'ASSISTANT';
  user: User;
  pharmacy: Pharmacy;
}

// Prescription related types
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  instructions: string;
}

export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  FILLED = 'FILLED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export interface Prescription {
  id: string;
  patientName: string;
  patientId: string;
  doctorId: string;
  pharmacyId?: string;
  status: PrescriptionStatus;
  createdAt: string;
  updatedAt: string;
  medications: Medication[];
  notes?: string;
}

// Inventory related types
export interface InventoryItem {
  id: string;
  pharmacyId: string;
  medicationId: string;
  medicationName: string;
  quantity: number;
  reorderLevel: number;
  supplierId: string;
  lastUpdated: string;
}

// Supplier related types
export interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
}

export interface Order {
  id: string;
  pharmacyId: string;
  supplierId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  medicationId: string;
  medicationName: string;
  quantity: number;
  unitPrice: number;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  read: boolean;
  createdAt: string;
}