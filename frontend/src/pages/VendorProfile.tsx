import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import AddServiceModal from '../components/AddServiceModal';

export default function VendorProfile() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [removingService, setRemovingService] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const [profileData, tokensData] = await Promise.all([
        api.getVendorProfile(user!.id),
        api.getVendorPending(user!.id),
      ]);
      
      setProfile(profileData);
      
      // Calculate statistics
      setStats({
        totalServices: profileData.services.length,
        pendingRequests: tokensData.length,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveService = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to remove "${serviceName}" service?`)) {
      return;
    }

    setRemovingService(serviceName);
    try {
      await api.removeVendorService(user!.id, serviceName);
      setProfile((prev: any) => ({
        ...prev,
        services: prev.services.filter((s: string) => s !== serviceName),
      }));
    } catch (error) {
      console.error('Failed to remove service:', error);
      alert('Failed to remove service');
    } finally {
      setRemovingService(null);
    }
  };

  const handleServiceAdded = () => {
    loadProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Vendor Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Personal Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p className="text-lg font-medium">{profile?.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p className="text-lg font-medium">{profile?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Member Since</label>
                  <p className="text-lg font-medium">
                    {new Date(profile?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">My Services</h2>
                <button
                  onClick={() => setShowAddService(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  + Add Service
                </button>
              </div>
              
              {profile?.services.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No services added yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {profile?.services.map((service: string) => (
                    <div
                      key={service}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="font-medium capitalize">{service}</span>
                      <button
                        onClick={() => handleRemoveService(service)}
                        disabled={removingService === service || profile.services.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={profile.services.length === 1 ? "Cannot remove last service" : "Remove service"}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Statistics</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Services</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.totalServices}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats?.pendingRequests}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showAddService && (
        <AddServiceModal
          vendorId={user!.id}
          onClose={() => setShowAddService(false)}
          onSuccess={handleServiceAdded}
        />
      )}
    </div>
  );
}
