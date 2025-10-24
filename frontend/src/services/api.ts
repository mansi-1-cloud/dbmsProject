import { useAuthStore } from '../store/authStore';

const API_BASE_URL = 'http://localhost:4000/api';

class ApiService {
  private getHeaders() {
    const token = useAuthStore.getState().token;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
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

  // Vendors
  async getVendors() {
    return this.request('/vendors');
  }

  async getVendorQueue(vendorId: string) {
    return this.request(`/vendors/${vendorId}/queue`);
  }

  async getVendorPending(vendorId: string) {
    return this.request(`/vendors/${vendorId}/pending`);
  }

  // Tokens
  async createToken(vendorId: string, serviceType: string, params?: any) {
    return this.request('/tokens', {
      method: 'POST',
      body: JSON.stringify({ vendorId, serviceType, params }),
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

  // Vendor Service Management
  async getVendorProfile(vendorId: string) {
    return this.request(`/vendors/${vendorId}/profile`);
  }

  async addVendorService(vendorId: string, service: string) {
    return this.request(`/vendors/${vendorId}/services`, {
      method: 'POST',
      body: JSON.stringify({ service }),
    });
  }

  async removeVendorService(vendorId: string, serviceName: string) {
    return this.request(`/vendors/${vendorId}/services/${encodeURIComponent(serviceName)}`, {
      method: 'DELETE',
    });
  }

  async updateVendorServices(vendorId: string, services: string[]) {
    return this.request(`/vendors/${vendorId}/services`, {
      method: 'PATCH',
      body: JSON.stringify({ services }),
    });
  }
}

export const api = new ApiService();
