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
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

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

  const handleCancelToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      await api.cancelToken(tokenId);
      setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, status: 'CANCELLED' } : t));
    } catch (error) {
      console.error('Failed to cancel token:', error);
      alert('Failed to cancel request');
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this completed request?')) {
      return;
    }

    try {
      await api.deleteToken(tokenId);
      setTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch (error) {
      console.error('Failed to delete token:', error);
      alert('Failed to delete request');
    }
  };

  const activeTokens = tokens.filter(t => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(t.status));
  const completedTokens = tokens.filter(t => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(t.status));

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

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'active'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Active Requests ({activeTokens.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'completed'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Completed ({completedTokens.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">
            {activeTab === 'active' ? 'Active Requests' : 'Completed Requests'}
          </h2>
          {activeTab === 'active' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              + New Request
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your requests...</p>
          </div>
        ) : activeTab === 'active' ? (
          activeTokens.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-xl text-gray-600 mb-4">No active requests</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Your First Request
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeTokens.map(token => (
                <div key={token.id} className="relative">
                  <div onClick={() => setSelectedToken(token)} className="cursor-pointer">
                    <TokenCard token={token} />
                  </div>
                  {['PENDING', 'QUEUED', 'IN_PROGRESS'].includes(token.status) && (
                    <button
                      onClick={() => handleCancelToken(token.id)}
                      className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition z-10"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          completedTokens.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-xl text-gray-600">No completed requests yet</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedTokens.map(token => (
                <div key={token.id} className="relative">
                  <div onClick={() => setSelectedToken(token)} className="cursor-pointer">
                    <TokenCard token={token} />
                  </div>
                  {token.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleDeleteToken(token.id)}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition z-10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
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
