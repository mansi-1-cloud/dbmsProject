import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface CreateTokenModalProps {
  onClose: () => void;
  onSuccess: (token: any) => void;
}

export default function CreateTokenModal({ onClose, onSuccess }: CreateTokenModalProps) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedVendorProfile, setSelectedVendorProfile] = useState<any>(null);
  const [serviceType, setServiceType] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVendorProfile, setShowVendorProfile] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const data = await api.getVendors();
      setVendors(data);
    } catch (error) {
      setError('Failed to load vendors');
    }
  };

  const availableServices = selectedVendor
    ? vendors.find(v => v.id === selectedVendor)?.services || []
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate description word count
    const wordCount = description.trim().split(/\s+/).length;
    if (wordCount > 100) {
      setError(`Description must be under 100 words (currently ${wordCount} words)`);
      return;
    }

    setLoading(true);

    try {
      const token = await api.createToken(selectedVendor, serviceType, subject, description);
      onSuccess(token);
    } catch (err: any) {
      setError(err.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">New Service Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Vendor
            </label>
            <div className="flex gap-2">
              <select
                value={selectedVendor}
                onChange={(e) => {
                  setSelectedVendor(e.target.value);
                  setServiceType('');
                  const vendor = vendors.find(v => v.id === e.target.value);
                  setSelectedVendorProfile(vendor || null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Choose a vendor --</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              {selectedVendorProfile && (
                <button
                  type="button"
                  onClick={() => setShowVendorProfile(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  View Profile
                </button>
              )}
            </div>
          </div>

          {selectedVendor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Choose a service --</option>
                {availableServices.map((service: string) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief title for your request"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description * (Max 100 words)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe your service request in detail..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.trim() ? description.trim().split(/\s+/).length : 0} / 100 words
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedVendor || !serviceType || !subject.trim() || !description.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>

        {/* Vendor Profile Modal */}
        {showVendorProfile && selectedVendorProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Vendor Profile</h3>
                <button
                  onClick={() => setShowVendorProfile(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{selectedVendorProfile.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{selectedVendorProfile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Services Offered</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedVendorProfile.services.map((service: string) => (
                      <span key={service} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowVendorProfile(false)}
                className="mt-6 w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
