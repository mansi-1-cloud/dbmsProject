import { useState } from 'react';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import { api } from '../services/api';

interface ManageServicesModalProps {
  vendorId: string;
  currentServices: string[];
  onClose: () => void;
  onUpdate: (services: string[]) => void;
}

export default function ManageServicesModal({ vendorId, currentServices, onClose, onUpdate }: ManageServicesModalProps) {
  const [services, setServices] = useState<string[]>(currentServices);
  const [newService, setNewService] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | boolean>(false); // string for serviceName, bool for add

  const handleAddService = async () => {
    setError('');
    if (!newService.trim()) return;

    const trimmedService = newService.trim().toLowerCase();
    if (services.includes(trimmedService)) {
      setError('Service already exists');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(trimmedService)) {
      setError('Invalid characters. Use letters, numbers, spaces, hyphens.');
      return;
    }

    setLoading('add');
    try {
      const updatedVendor = await api.addVendorService(vendorId, trimmedService);
      setServices(updatedVendor.services);
      onUpdate(updatedVendor.services);
      setNewService('');
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
    setLoading(serviceName);
    setError('');
    try {
  const updatedVendor = await api.removeVendorService(vendorId, serviceName);
  setServices(updatedVendor.services);
  onUpdate(updatedVendor.services);
    } catch (err: any) {
      setError(err.message || 'Failed to remove service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Manage Services" onClose={onClose}>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Add New Service</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newService}
            onChange={(e) => { setNewService(e.target.value); setError(''); }}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
            placeholder="e.g., Photocopying"
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading === 'add'}
          />
          <button
            onClick={handleAddService}
            disabled={!!loading || !newService.trim()}
            className="px-4 py-2 w-20 flex justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading === 'add' ? <LoadingSpinner /> : 'Add'}
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Current Services</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {services.map((service) => (
            <div 
              key={service} 
              className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 px-4 py-2 rounded-lg"
            >
              <span className="capitalize font-medium text-zinc-900 dark:text-zinc-100">{service}</span>
              <button
                onClick={() => handleRemoveService(service)}
                disabled={!!loading || services.length === 1}
                className="text-red-600 hover:text-red-800 disabled:opacity-50"
                title={services.length === 1 ? 'Cannot remove last service' : 'Remove service'}
              >
                {loading === service ? <LoadingSpinner /> : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
