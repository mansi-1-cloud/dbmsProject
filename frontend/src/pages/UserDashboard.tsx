import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { socket } from '../services/socket';
import TokenCard from '../components/TokenCard';
import CreateTokenModal from '../components/CreateTokenModal';
import TokenDetailModal from '../components/TokenDetailModal';

export default function UserDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);

  useEffect(() => {
    loadTokens();
    
    // Connect to WebSocket
    socket.connect();

    // Listen for token updates
    socket.on('token.updated', (updatedToken) => {
      setTokens(prev => prev.map(t => t.id === updatedToken.id ? updatedToken : t));
    });

    return () => {
      socket.off('token.updated');
    };
  }, []);

  const loadTokens = async () => {
    try {
      const data = await api.getUserTokens();
      setTokens(data);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate('/');
  };

  const handleTokenCreated = (newToken: any) => {
    setTokens(prev => [newToken, ...prev]);
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">QueueFlow</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name}!</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/user/profile')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">My Service Requests</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            + New Request
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your requests...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-xl text-gray-600 mb-4">No service requests yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Your First Request
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tokens.map(token => (
              <div key={token.id} onClick={() => setSelectedToken(token)} className="cursor-pointer">
                <TokenCard token={token} />
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateTokenModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTokenCreated}
        />
      )}

      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
    </div>
  );
}
