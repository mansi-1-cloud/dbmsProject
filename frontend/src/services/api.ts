import { getDefaultStore } from 'jotai';
import { tokenAtom } from '../store/authAtoms';
import { UserProfile, Vendor, Token } from '../types'; // Import types

// Use Vite's env variable, falling back to your new URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Get the Jotai store instance
const store = getDefaultStore();

class ApiService {
  private getHeaders() {
    // Get token from Jotai atom
    const token = store.get(tokenAtom);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * The core request helper.
   * Handles auth headers, fetch, and error/response parsing.
   */
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    // Handle 204 No Content (e.g., from a DELETE)
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      // If validation errors exist, format them nicely
      if (data.issues && Array.isArray(data.issues)) {
        const errorMessages = data.issues.map((issue: any) => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new Error(`${data.error}: ${errorMessages}`);
      }
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // --- Auth ---
  async registerUser(email: string, name: string, password: string) {
    return this.request('/auth/register/user', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    });
  }

  async registerVendor(email: string, name: string, password: string, services: string[]) {
    return this.request('/auth/register/vendor', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, services }),
    });
  }

  async loginUser(email: string, password: string) {
    return this.request('/auth/login/user', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async loginVendor(email: string, password: string) {
    return this.request('/auth/login/vendor', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // --- Vendors ---
  async getVendors(): Promise<Vendor[]> {
    return this.request('/vendors');
  }

  async getVendorQueue(vendorId: string): Promise<Token[]> {
    return this.request(`/vendors/${vendorId}/queue`);
  }

  async getVendorPending(vendorId: string): Promise<Token[]> {
    return this.request(`/vendors/${vendorId}/pending`);
  }

  async getVendorStats(vendorId: string): Promise<{
    pendingCount: number;
    activeCount: number;
    completedToday: number;
    completedTotal: number;
  }> {
    return this.request(`/vendors/${vendorId}/stats`);
  }

  // --- User Dashboard ---
  async getUserPending(userId: string): Promise<Token[]> {
    return this.request(`/tokens/user/${userId}/pending`);
  }

  async getUserHistory(userId: string): Promise<Token[]> {
    return this.request(`/tokens/user/${userId}/history`);
  }

  async getUserStats(userId: string): Promise<{
    pendingCount: number;
    completedToday: number;
    completedTotal: number;
  }> {
    return this.request(`/tokens/user/${userId}/stats`);
  }

  // --- Tokens ---
  async createToken(vendorId: string, serviceType: string, subject: string, description: string, params?: any) {
    return this.request('/tokens', {
      method: 'POST',
      body: JSON.stringify({ vendorId, serviceType, subject, description, params }),
    });
  }

  async getUserTokens() {
    return this.request('/tokens/user/me');
  }

  async getToken(tokenId: string) {
    return this.request(`/tokens/${tokenId}`);
  }

  async approveToken(tokenId: string) {
    return this.request(`/tokens/${tokenId}/approve`, {
      method: 'POST',
    });
  }

  async rejectToken(tokenId: string, vendorMessage?: string) {
    return this.request(`/tokens/${tokenId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ vendorMessage }),
    });
  }

  async completeToken(tokenId: string) {
    return this.request(`/tokens/${tokenId}/complete`, {
      method: 'POST',
    });
  }

  // --- Vendor Service Management ---
  async getVendorProfile(vendorId: string): Promise<Vendor> {
    return this.request(`/vendors/${vendorId}/profile`);
  }

  async addVendorService(vendorId: string, service: string): Promise<Vendor> {
    return this.request(`/vendors/${vendorId}/services`, {
      method: 'POST',
      body: JSON.stringify({ service }),
    });
  }

  async removeVendorService(vendorId: string, serviceName: string): Promise<Vendor> {
    return this.request(`/vendors/${vendorId}/services/${encodeURIComponent(serviceName)}`, {
      method: 'DELETE',
    });
  }

  async updateVendorServices(vendorId: string, services: string[]): Promise<Vendor> {
    return this.request(`/vendors/${vendorId}/services`, {
      method: 'PATCH',
      body: JSON.stringify({ services }),
    });
  }

  // --- Token Actions ---
  async cancelToken(tokenId: string) {
    return this.request(`/tokens/${tokenId}/cancel`, {
      method: 'POST',
    });
  }

  async deleteToken(tokenId: string) {
    return this.request(`/tokens/${tokenId}`, {
      method: 'DELETE',
    });
  }

  // --- Profile Management ---
  async getUserProfile(): Promise<UserProfile> {
    return this.request('/auth/user/profile');
  }

  async updateUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.request('/auth/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateVendorProfile(vendorId: string, data: Partial<Vendor>): Promise<Vendor> {
    return this.request(`/vendors/${vendorId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();

