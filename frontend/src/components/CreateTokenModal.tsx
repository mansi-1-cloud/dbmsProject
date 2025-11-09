import { useState, useEffect } from 'react';
import { Modal } from './Modal'; // This is a named import
import { LoadingSpinner } from './LoadingSpinner'; // This is a named import
import { api } from '../services/api';
import { Vendor } from '../types';

interface CreateTokenModalProps {
  onClose: () => void;
  onSuccess: (token: any) => void; // Replace 'any' with your Token type
}

// This component uses 'export default'
export default function CreateTokenModal({ onClose, onSuccess }: CreateTokenModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true); // For loading vendors
  const [submitLoading, setSubmitLoading] = useState(false); // For form submission

  useEffect(() => {
    const loadVendors = async () => {
      try {
        setPageLoading(true);
        setError('');
        const data = await api.getVendors();
        setVendors(data);
      } catch (error) {
        setError('Failed to load vendors');
      } finally {
        setPageLoading(false);
      }
    };
    loadVendors();
  }, []);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const availableServices = selectedVendor?.services || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const wordCount = description.trim().split(/\s+/).length;
    if (wordCount > 100) {
      setError(`Description must be under 100 words (currently ${wordCount} words)`);
      return;
    }

    setSubmitLoading(true);

    try {
      const token = await api.createToken(
        selectedVendorId,
        serviceType,
        subject,
        description,
        {} // Pass an empty object for the optional 'params' argument
      );
      
      onSuccess(token);
      onClose();
    } catch (err: any) {
      // Handle validation errors from backend
      if (err.message && err.message.includes('Validation failed')) {
        setError('Validation failed. Please check all fields.');
      } else {
        setError(err.message || 'Failed to create request');
      }
      console.error('Create token error:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const isFormValid = selectedVendorId && serviceType && subject.trim() && description.trim();

  return (
    <Modal title="New Service Request" onClose={onClose}>
      {pageLoading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="vendor" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Select Vendor
            </label>
            <select
              id="vendor"
              value={selectedVendorId}
              onChange={(e) => {
                setSelectedVendorId(e.target.value);
                setServiceType('');
              }}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" className="text-zinc-900 dark:text-zinc-100">-- Choose a vendor --</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id} className="text-zinc-900 dark:text-zinc-100">
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          {selectedVendorId && (
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Service Type
              </label>
              <select
                id="service"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="" className="text-zinc-900 dark:text-zinc-100">-- Choose a service --</option>
                {availableServices.map((service: string) => (
                  <option key={service} value={service} className="capitalize text-zinc-900 dark:text-zinc-100">
                    {service}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief title for your request"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description (Max 100 words)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe your service request in detail..."
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {description.trim() ? description.trim().split(/\s+/).length : 0} / 100 words
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading || !isFormValid}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitLoading ? <LoadingSpinner /> : 'Create Request'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

