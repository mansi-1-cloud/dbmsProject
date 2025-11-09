import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Use new Jotai auth hook
import { api } from '../services/api';
import { UserProfile as UserProfileType, Token } from '../types'; // Renamed to avoid conflict
import { PageLoader } from '../components/LoadingSpinner';
import EditUserProfileModal from '../components/EditUserProfileModal';
import { BackIcon, EditIcon } from '../components/Icons'; // Use SVG Icons

export default function UserProfile() {
  const { user, setUser } = useAuth(); // Use new Jotai auth hook
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const stats = {
    total: tokens.length,
    pending: tokens.filter((t) => ['PENDING', 'QUEUED', 'IN_PROGRESS'].includes(t.status)).length,
    completed: tokens.filter((t) => t.status === 'COMPLETED').length,
    rejected: tokens.filter((t) => t.status === 'REJECTED' || t.status === 'CANCELLED').length,
  };

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    try {
      const [profileData, tokensData] = await Promise.all([
        api.getUserProfile(),
        api.getUserTokens(),
      ]);
      setProfile(profileData);
      setTokens(tokensData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback
      if (user) {
        setProfile({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: null,
          address: null,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdated = (updatedProfile: UserProfileType) => {
    setProfile(updatedProfile);
    if (user) {
      // Update the auth store with the new name and details
      setUser({ 
        ...user, 
        name: updatedProfile.name,
      });
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow-sm border-b dark:border-zinc-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/user/dashboard')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2"
          >
            <BackIcon />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border dark:border-zinc-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Personal Information</h2>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <EditIcon />
                  Edit Profile
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <InfoBlock label="Name" value={profile?.name || user?.name} />
                <InfoBlock label="Email" value={profile?.email || user?.email} />
                <InfoBlock label="Phone Number" value={profile?.phoneNumber} />
                <InfoBlock label="Address" value={profile?.address} />
                <InfoBlock label="Account Type" value="User" />
              </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border dark:border-zinc-700">
              <h2 className="text-2xl font-bold mb-4">Recent Requests</h2>
              
              {tokens.length === 0 ? (
                <p className="text-zinc-500 text-center py-8 dark:text-zinc-400">No requests yet</p>
              ) : (
                <div className="space-y-3">
                  {tokens.slice(0, 5).map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <div>
                        <p className="font-medium capitalize">{token.serviceType}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={token.status} />
                    </div>
                  ))}
                  {tokens.length > 5 && (
                    <button
                      onClick={() => navigate('/user/dashboard')}
                      className="w-full text-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-2"
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
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 border dark:border-zinc-700">
              <h2 className="text-xl font-bold mb-4">Request Statistics</h2>
              <div className="space-y-4">
                <StatCard label="Total Requests" value={stats.total} color="blue" />
                <StatCard label="Pending" value={stats.pending} color="yellow" />
                <StatCard label="Completed" value={stats.completed} color="green" />
                <StatCard label="Rejected/Cancelled" value={stats.rejected} color="red" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {showEditModal && profile && (
        <EditUserProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleProfileUpdated}
        />
      )}
    </div>
  );
}

// Sub-components
const InfoBlock = ({ label, value }: { label: string, value: string | null | undefined }) => (
  <div>
    <label className="text-sm text-zinc-600 dark:text-zinc-400">{label}</label>
    <p className="text-lg font-medium">{value || 'Not provided'}</p>
  </div>
);

const StatCard = ({ label, value, color }: { label: string, value: number, color: string }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  };
  return (
    <div className={`p-4 rounded-lg ${colors[color]}`}>
      <p className="text-sm">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    QUEUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    CANCELLED: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || colors.CANCELLED}`}>
      {status}
    </span>
  );
};

