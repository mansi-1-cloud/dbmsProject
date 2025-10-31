// This file must have at least one export to be a module.

/**
 * Defines the roles a user can have in the system.
 */
export type Role = 'USER' | 'VENDOR' | 'ADMIN';

/**
 * Represents the user object stored in the auth state (Jotai/Zustand).
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  services?: string[]; // Only for vendors
}

/**
 * A simplified User object, often embedded in other data models.
 */
export interface User {
  name: string;
  email: string;
}

/**
 * The full User profile.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber: string | null;
  address: string | null;
}

/**
 * The full Vendor profile.
 */
export interface Vendor {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  services: string[];
  createdAt: string; // ISO string
}

/**
 * Defines the possible states a token can be in.
 */
export type TokenStatus = 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

/**
 * The main data model for a service request "Token".
 * This is what's received from the API.
 */
export interface Token {
  id: string;
  userId: string;
  vendorId: string;
  serviceType: string;
  subject?: string;
  description?: string;
  params?: any; // For any extra JSON data
  status: TokenStatus;
  estimatedCompletion: string | null; // ISO string
  vendorMessage: string | null;
  queuePosition: number | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string

  // --- Embedded data from API (optional) ---
  user?: User; 
  vendor?: { name: string; email: string };
}

