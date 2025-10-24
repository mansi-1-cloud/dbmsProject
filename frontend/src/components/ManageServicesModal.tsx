import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface ManageServicesModalProps {
  vendorId: string;
  currentServices: string[];
  onClose: () => void;
  onUpdate: (services: string[]) => void;
}

export default function ManageServicesModal({ 
  vendorId, 
  currentServices, 
  onClose, 
  onUpdate 
}: ManageServicesModalProps) {
  const [services, setServices] = useState<string[]>(currentServices);
  const [newService, setNewService] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setServices(currentServices);
  }, [currentServices]);

  const handleAddService = async () => {
    if (!newService.trim()) {
      setError('Service name cannot be empty');
      return;
    }

    const trimmedService = newService.trim().toLowerCase();

    // Check if service already exists
    if (services.includes(trimmedService)) {
      setError('Service already exists');
      return;
    }

    // Validate service name
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedService)) {
      setError('Service name can only contain letters, numbers, spaces, and hyphens');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.addVendorService(vendorId, trimmedService);
      setServices(result.services);
      setNewService('');
      onUpdate(result.services);
    } catch (err: any) {
      setError(err.message || 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async (serviceName: string) => {
    if (services.length === 1) {
      setError('Cannot remove the last service');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.removeVendorService(vendorId, serviceName);
      setServices(result.services);
      onUpdate(result.services);
    } catch (err: any) {
      setError(err.message || 'Failed to remove service');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddService();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Manage Services</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Current Services */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Services</h3>
          <div className="space-y-2">
            {services.map((service) => (
              <div 
                key={service} 
                className="flex items-center justify-between bg-blue-50 px-4 py-2 rounded-lg"
              >
                <span className="capitalize font-medium">{service}</span>
                <button
                  onClick={() => handleRemoveService(service)}
                  disabled={loading || services.length === 1}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={services.length === 1 ? 'Cannot remove last service' : 'Remove service'}
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Service */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Service</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newService}
              onChange={(e) => {
                setNewService(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="e.g., photocopying"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleAddService}
              disabled={loading || !newService.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Service names can only contain letters, numbers, spaces, and hyphens
          </p>
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
