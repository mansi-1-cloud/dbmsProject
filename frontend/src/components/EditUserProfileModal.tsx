import { useState } from 'react';
import { api } from '../services/api';

interface EditUserProfileModalProps {
  profile: any;
  onClose: () => void;
  onSuccess: (updatedProfile: any) => void;
}

export default function EditUserProfileModal({ profile, onClose, onSuccess }: EditUserProfileModalProps) {
  const [name, setName] = useState(profile.name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [address, setAddress] = useState(profile.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone number if provided
    if (phoneNumber && phoneNumber.length > 0 && phoneNumber.replace(/\D/g, '').length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        name: name.trim(),
      };
      
      // Only include phoneNumber and address if they have values
      if (phoneNumber.trim()) {
        updateData.phoneNumber = phoneNumber.trim();
      } else {
        updateData.phoneNumber = null;
      }
      
      if (address.trim()) {
        updateData.address = address.trim();
      } else {
        updateData.address = null;
      }

      console.log('Updating user profile with:', updateData);
      const updatedProfile = await api.updateUserProfile(updateData);
      console.log('Profile updated successfully:', updatedProfile);
      onSuccess(updatedProfile);
      onClose();
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(digits);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10-digit number (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">Enter exactly 10 digits (no spaces or symbols)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
