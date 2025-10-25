import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import EditUserProfileModal from '../components/EditUserProfileModal';

export default function UserProfile() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0,
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const [profileData, tokensData] = await Promise.all([
        api.getUserProfile(),
        api.getUserTokens(),
      ]);
      console.log('Loaded profile:', profileData);
      setProfile(profileData);
      setTokens(tokensData);
      
      // Calculate statistics
      setStats({
        total: tokensData.length,
        pending: tokensData.filter((t: any) => t.status === 'PENDING').length,
        completed: tokensData.filter((t: any) => t.status === 'COMPLETED').length,
        rejected: tokensData.filter((t: any) => t.status === 'REJECTED').length,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to user data from auth store
      if (user) {
        setProfile({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: null,
          address: null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdated = (updatedProfile: any) => {
    setProfile(updatedProfile);
    if (user) {
      setUser({ 
        ...user, 
        name: updatedProfile.name,
        email: updatedProfile.email,
      });
    }
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
            onClick={() => navigate('/user/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Personal Information</h2>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Edit Profile
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <p className="text-lg font-medium">{profile?.name || user?.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <p className="text-lg font-medium">{profile?.email || user?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone Number</label>
                  <p className="text-lg font-medium">{profile?.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Address</label>
                  <p className="text-lg font-medium">{profile?.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Account Type</label>
                  <p className="text-lg font-medium">User</p>
                </div>
              </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Recent Requests</h2>
              
              {tokens.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No requests yet</p>
              ) : (
                <div className="space-y-3">
                  {tokens.slice(0, 5).map((token: any) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <p className="font-medium capitalize">{token.serviceType}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        token.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        token.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        token.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {token.status}
                      </span>
                    </div>
                  ))}
                  {tokens.length > 5 && (
                    <button
                      onClick={() => navigate('/user/dashboard')}
                      className="w-full text-center text-blue-600 hover:text-blue-800 py-2"
                    >
                      View all requests →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Request Statistics</h2>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showEditModal && (
        <EditUserProfileModal
          profile={profile || { name: user?.name || '', email: user?.email || '', phoneNumber: '', address: '' }}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleProfileUpdated}
        />
      )}
    </div>
  );
}
