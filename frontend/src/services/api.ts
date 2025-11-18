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

    let data;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Response is not JSON:', text);
        throw new Error(`Invalid response format. Expected JSON but got: ${contentType || 'unknown'}`);
      }
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

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
  async registerUser(email: string, name: string, password: string, phoneNumber: string) {
    return this.request('/auth/register/user', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, phoneNumber }),
    });
  }

  async registerVendor(email: string, name: string, password: string, phoneNumber: string, services: string[]) {
    return this.request('/auth/register/vendor', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, phoneNumber, services }),
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
  async createToken(vendorId: string, serviceType: string, subject: string, description: string, params?: any, files?: File[]) {
    // If files are provided, use FormData instead of JSON
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('vendorId', vendorId);
      formData.append('serviceType', serviceType);
      formData.append('subject', subject);
      formData.append('description', description);
      
      // Append params as JSON string if provided
      if (params) {
        formData.append('params', JSON.stringify(params));
      }
      
      // Append all files
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Get token for auth
      const token = store.get(tokenAtom);
      
      try {
        const response = await fetch(`${API_BASE_URL}/tokens`, {
          method: 'POST',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
            // Don't set Content-Type - let browser set it with boundary for multipart/form-data
          },
          body: formData,
        });
        
        if (response.status === 204) {
          return null;
        }

        let data;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            console.error('Response is not JSON:', text);
            throw new Error(`Invalid response format. Expected JSON but got: ${contentType || 'unknown'}`);
          }
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Request failed');
        }
        
        return data;
      } catch (error) {
        console.error('File upload error:', error);
        throw error;
      }
    }
    
    // Original JSON request (no files)
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

  async cancelTokenByVendor(tokenId: string, reason: string) {
    return this.request(`/tokens/${tokenId}/cancel-by-vendor`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
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

  async downloadFile(tokenId: string, fileIndex: number) {
    try {
      const token = store.get(tokenAtom);
      const response = await fetch(`${API_BASE_URL}/tokens/${tokenId}/files/${fileIndex}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Download failed');
      }

      // Check content type to determine how to handle response
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Response is JSON with download info
        const data = await response.json();
        
        if (data.isDemo) {
          // For demo mode, show info to user
          alert(`Demo Mode: ${data.message}\n\nIn production with Cloudinary configured, you would be able to download "${data.fileName}".`);
          return;
        }
        
        if (data.downloadUrl) {
          // Open the download URL in new tab
          window.open(data.downloadUrl, '_blank');
          return;
        }
      } else if (contentType?.includes('application/') || contentType?.includes('text/')) {
        // Response is binary/file content - download it
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `file_${fileIndex}`;
        
        // Get filename from response headers if available
        const disposition = response.headers.get('content-disposition');
        if (disposition) {
          const match = disposition.match(/filename="(.+?)"/);
          if (match) link.download = match[1];
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // Fallback: treat as redirect
      throw new Error('Unexpected response format');
    } catch (error) {
      console.error('File download error:', error);
      throw error;
    }
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

