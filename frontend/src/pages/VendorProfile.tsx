import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { PageLoader, LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import AddServiceModal from '../components/AddServiceModal';
import EditVendorProfileModal from '../components/EditVendorProfileModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { Vendor } from '../types';

export default function VendorProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Vendor | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [removingService, setRemovingService] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const [profileData, tokensData] = await Promise.all([
        api.getVendorProfile(user.id),
        api.getVendorPending(user.id),
      ]);
      setProfile(profileData);
      setPendingRequests(tokensData.length);
    } catch (error) {
      console.error('Failed to load vendor profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async () => {
    if (!showConfirmDelete || !user) return;
    setRemovingService(showConfirmDelete);
    try {
      const updatedProfile = await api.removeVendorService(user.id, showConfirmDelete);
      handleProfileUpdated(updatedProfile);
    } catch (error) {
      console.error('Failed to remove service:', error);
      alert('Failed to remove service. Please try again.');
    } finally {
      setRemovingService(null);
      setShowConfirmDelete(null);
    }
  };

  const handleProfileUpdated = (updatedProfile: Vendor) => {
    setProfile(updatedProfile);
    // Update auth store
    // setUser({ ...user, ...updatedProfile });
  };

  if (loading) return <PageLoader />;
  if (!profile) return <div className="p-8">Profile not found.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <header className="bg-white dark:bg-zinc-800 shadow-sm border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mb-1 flex items-center gap-1 text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Vendor Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <ProfileCard profile={profile} onEdit={() => setShowEditModal(true)} />
            <ServicesCard
              services={profile.services}
              onAdd={() => setShowAddService(true)}
              onRemove={(service) => setShowConfirmDelete(service)}
              removingService={removingService}
            />
          </div>
          <StatsCard servicesCount={profile.services.length} pendingCount={pendingRequests} />
        </div>
      </main>

      {showAddService && (
        <AddServiceModal
          vendorId={user!.id}
          onClose={() => setShowAddService(false)}
          onSuccess={(newServices) => setProfile(p => ({ ...p!, services: newServices }))}
        />
      )}
      {showEditModal && (
        <EditVendorProfileModal
          vendorId={user!.id}
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => handleProfileUpdated(updated)}
        />
      )}
      {showConfirmDelete && (
        <ConfirmDeleteModal
          serviceName={showConfirmDelete}
          onClose={() => setShowConfirmDelete(null)}
          onConfirm={handleRemoveService}
          loading={!!removingService}
        />
      )}
    </div>
  );
}

// --- Sub-components for Profile Page ---

const ProfileCard = ({ profile, onEdit }: { profile: Vendor; onEdit: () => void }) => (
  <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">Personal Information</h2>
      <button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
        Edit Profile
      </button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <InfoItem label="Name" value={profile.name} />
      <InfoItem label="Email" value={profile.email} />
      <InfoItem label="Phone Number" value={profile.phoneNumber} />
      <InfoItem label="Address" value={profile.address} />
      <InfoItem label="Member Since" value={new Date(profile.createdAt).toLocaleDateString()} />
    </div>
  </div>
);

const ServicesCard = ({ services, onAdd, onRemove, removingService }: { services: string[]; onAdd: () => void; onRemove: (service: string) => void; removingService: string | null }) => (
  <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-bold">My Services</h2>
      <button onClick={onAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
        + Add Service
      </button>
    </div>
    {services.length === 0 ? (
      <p className="text-zinc-500 dark:text-zinc-400 text-center py-8">No services added yet.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((service: string) => (
          <div key={service} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg border border-zinc-200 dark:border-zinc-600">
            <span className="font-medium capitalize">{service}</span>
            <button
              onClick={() => onRemove(service)}
              disabled={removingService === service || services.length === 1}
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
              title={services.length === 1 ? "Cannot remove last service" : "Remove service"}
            >
              {removingService === service ? <LoadingSpinner /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              )}
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

const StatsCard = ({ servicesCount, pendingCount }: { servicesCount: number; pendingCount: number }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 p-6">
      <h2 className="text-xl font-bold mb-4">Statistics</h2>
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Services</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{servicesCount}</p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Pending Requests</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
        </div>
      </div>
    </div>
  </div>
);

const InfoItem = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <label className="text-sm text-zinc-600 dark:text-zinc-400">{label}</label>
    <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{value || 'Not provided'}</p>
  </div>
);

const ConfirmDeleteModal = ({ serviceName, onClose, onConfirm, loading }: { serviceName: string; onClose: () => void; onConfirm: () => void; loading: boolean }) => (
  <Modal title="Confirm Deletion" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-zinc-700 dark:text-zinc-300">
        Are you sure you want to remove the service: <strong className="capitalize">{serviceName}</strong>?
      </p>
      <p className="text-sm text-yellow-600 dark:text-yellow-400">
        This action cannot be undone.
      </p>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? <LoadingSpinner /> : 'Delete Service'}
        </button>
      </div>
    </div>
  </Modal>
);
