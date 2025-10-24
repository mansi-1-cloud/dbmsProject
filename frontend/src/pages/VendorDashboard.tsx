import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { socket } from '../services/socket';
import VendorQueueCard from '../components/VendorQueueCard';
import TokenDetailModal from '../components/TokenDetailModal';
import AddServiceModal from '../components/AddServiceModal';

export default function VendorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'queue'>('pending');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [showAddService, setShowAddService] = useState(false);

  useEffect(() => {
    loadData();
    
    // Connect to WebSocket
    socket.connect();

    // Listen for new tokens
    socket.on('token.created', (newToken) => {
      setPendingRequests(prev => [...prev, newToken]);
    });

    // Listen for queue updates
    socket.on('queue.update', (updatedQueue) => {
      setQueueItems(updatedQueue);
    });

    return () => {
      socket.off('token.created');
      socket.off('queue.update');
    };
  }, [user]);

  const loadData = async () => {
    try {
      const [pending, queue] = await Promise.all([
        api.getVendorPending(user!.id),
        api.getVendorQueue(user!.id),
      ]);
      setPendingRequests(pending);
      setQueueItems(queue);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tokenId: string) => {
    try {
      await api.approveToken(tokenId);
      setPendingRequests(prev => prev.filter(t => t.id !== tokenId));
    } catch (error) {
      console.error('Failed to approve token:', error);
    }
  };

  const handleReject = async (tokenId: string) => {
    try {
      const message = prompt('Reason for rejection (optional):');
      await api.rejectToken(tokenId, message || undefined);
      setPendingRequests(prev => prev.filter(t => t.id !== tokenId));
    } catch (error) {
      console.error('Failed to reject token:', error);
    }
  };

  const handleComplete = async (tokenId: string) => {
    try {
      await api.completeToken(tokenId);
      setQueueItems(prev => prev.filter(t => t.id !== tokenId));
    } catch (error) {
      console.error('Failed to complete token:', error);
    }
  };

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">QueueFlow Vendor</h1>
            <p className="text-sm text-gray-600">{user?.name}</p>
            <p className="text-xs text-gray-500">Services: {user?.services?.join(', ')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/vendor/profile')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Profile
            </button>
            <button
              onClick={() => setShowAddService(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + Add Service
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
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'pending'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pending Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-6 py-4 font-semibold transition ${
                activeTab === 'queue'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Active Queue ({queueItems.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-xl text-gray-600">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(token => (
                <div key={token.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="flex-1" onClick={() => setSelectedToken(token)}>
                      <h3 className="text-xl font-bold capitalize mb-2">{token.serviceType}</h3>
                      <p className="text-gray-600 mb-1">From: {token.user.name} ({token.user.email})</p>
                      <p className="text-sm text-gray-500">
                        Requested: {new Date(token.createdAt).toLocaleString()}
                      </p>
                      {token.params && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Details:</strong> {JSON.stringify(token.params)}
                        </div>
                      )}
                      <p className="text-xs text-blue-600 mt-2">Click for full details →</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApprove(token.id); }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReject(token.id); }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          queueItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-xl text-gray-600">Queue is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queueItems.map(token => (
                <VendorQueueCard
                  key={token.id}
                  token={token}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )
        )}
      </main>

      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {showAddService && (
        <AddServiceModal
          vendorId={user!.id}
          onClose={() => setShowAddService(false)}
          onSuccess={() => {
            setShowAddService(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
