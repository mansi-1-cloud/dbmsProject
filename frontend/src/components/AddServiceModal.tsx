import { useState } from 'react';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import { api } from '../services/api';

interface AddServiceModalProps {
  vendorId: string;
  onClose: () => void;
  onSuccess: (updatedServices: string[]) => void;
}

export default function AddServiceModal({ vendorId, onClose, onSuccess }: AddServiceModalProps) {
  const [serviceName, setServiceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Add validation
    if (!/^[a-zA-Z0-9\s-]+$/.test(serviceName)) {
      setError('Invalid characters. Use letters, numbers, spaces, hyphens.');
      return;
    }
    
    setLoading(true);
    try {
      const updatedVendor = await api.addVendorService(vendorId, serviceName.trim());
      onSuccess(updatedVendor.services);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add New Service" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Service Name
          </label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g., Document Printing"
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Letters, numbers, spaces, and hyphens only.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !serviceName.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : 'Add Service'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
