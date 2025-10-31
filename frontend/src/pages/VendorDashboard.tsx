import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { socket } from '../services/socket';
import VendorQueueCard from '../components/VendorQueueCard';
import TokenDetailModal from '../components/TokenDetailModal';
import AddServiceModal from '../components/AddServiceModal';
import { Modal } from '../components/Modal';
import { LoadingSpinner, PageLoader } from '../components/LoadingSpinner';
import { ThemeToggle } from '../components/ThemeToggle';
import { Token } from '../types';


export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<Token[]>([]);
  const [queueItems, setQueueItems] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingTokenId, setApprovingTokenId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'queue'>('pending');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<Token | null>(null);

  useEffect(() => {
    loadData();
    socket.connect();
    socket.on('token.created', (newToken: Token) => setPendingRequests(prev => [newToken, ...prev]));
    socket.on('queue.update', (updatedQueue: Token[]) => setQueueItems(updatedQueue || [])); // Add guard for null/undefined
    return () => {
      socket.off('token.created');
      socket.off('queue.update');
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [pending, queue] = await Promise.all([
        api.getVendorPending(user.id),
        api.getVendorQueue(user.id),
      ]);
      setPendingRequests(pending || []);
      setQueueItems(queue || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tokenId: string) => {
    setApprovingTokenId(tokenId);
    try {
      const approvedToken = await api.approveToken(tokenId);
      setPendingRequests(prev => prev.filter(t => t.id !== tokenId));
      setQueueItems(prev => [approvedToken, ...prev.filter(t => t.id !== tokenId)]);
      setActiveTab('queue');
    } catch (error) {
      console.error('Failed to approve token:', error);
      alert('Failed to approve token. Please try again.');
    } finally {
      setApprovingTokenId(null);
    }
  };

  const handleReject = async (tokenId: string, message?: string) => {
    try {
      await api.rejectToken(tokenId, message);
      setPendingRequests(prev => prev.filter(t => t.id !== tokenId));
      setShowRejectModal(null);
    } catch (error) {
      console.error('Failed to reject token:', error);
      alert('Failed to reject token. Please try again.');
    }
  };

  const handleComplete = async (tokenId: string) => {
    try {
      await api.completeToken(tokenId);
      setQueueItems(prev => prev.filter(t => t.id !== tokenId));
    } catch (error) {
      console.error('Failed to complete token:', error);
      alert('Failed to complete token. Please try again.');
    }
  };

  const handleLogout = () => {
    socket.disconnect();
    logout();
    navigate('/');
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-lg border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">QueueFlow Vendor</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{user?.name}</p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <ThemeToggle />
            <button
              onClick={() => navigate('/vendor/profile')}
              className="px-4 py-2 text-sm font-medium bg-zinc-800 text-white rounded-lg dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-80 transition"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:opacity-80 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <TabButton name="Pending" count={pendingRequests.length} active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} />
            <TabButton name="Queue" count={queueItems.length} active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'pending' && (
          <PendingTab
            requests={pendingRequests}
            onApprove={handleApprove}
            onReject={(token) => setShowRejectModal(token)}
            onSelect={setSelectedToken}
            approvingId={approvingTokenId}
          />
        )}
        {activeTab === 'queue' && (
          <QueueTab
            items={queueItems}
            onComplete={handleComplete}
            onSelect={setSelectedToken}
          />
        )}
      </main>

      {selectedToken && (
        <TokenDetailModal token={selectedToken} onClose={() => setSelectedToken(null)} />
      )}
      {showRejectModal && (
        <RejectTokenModal 
          token={showRejectModal}
          onClose={() => setShowRejectModal(null)}
          onReject={(tokenId, message) => handleReject(tokenId, message)}
        />
      )}
      {showAddService && (
        <AddServiceModal
          vendorId={user!.id}
          onClose={() => setShowAddService(false)}
          onSuccess={() => {
            // Refreshes data instead of reload
            loadData();
            setShowAddService(false);
          }}
        />
      )}
    </div>
  );
}

// --- Sub-components for Tabs ---

const TabButton = ({ name, count, active, onClick }: { name: string; count: number; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-3 font-semibold transition-colors ${
      active ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
    }`}
  >
    {name}
    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
      active ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
    }`}>
      {count}
    </span>
    {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
  </button>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
    <p className="text-xl text-zinc-600 dark:text-zinc-400">{message}</p>
  </div>
);

const PendingTab = ({ requests, onApprove, onReject, onSelect, approvingId }: { requests: Token[]; onApprove: (id: string) => void; onReject: (token: Token) => void; onSelect: (token: Token) => void; approvingId: string | null }) => {
  if (requests.length === 0) return <EmptyState message="No pending requests" />;
  return (
    <div className="space-y-4">
      {/* --- FIX: Filter out null/undefined items --- */}
      {requests.filter(Boolean).map(token => (
        <div key={token.id} className="bg-white dark:bg-zinc-800 rounded-lg shadow border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start">
            <div className="flex-1 cursor-pointer" onClick={() => onSelect(token)}>
              <h3 className="text-xl font-bold capitalize mb-2 text-zinc-900 dark:text-zinc-100">{token.serviceType}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-1">From: {token.user?.name} ({token.user?.email})</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Requested: {new Date(token.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-blue-500 mt-2">Click for full details →</p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0 sm:ml-4">
              <button
                onClick={() => onApprove(token.id)}
                disabled={approvingId === token.id}
                className="px-4 py-2 w-28 flex justify-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {approvingId === token.id ? <LoadingSpinner /> : 'Approve'}
              </button>
              <button
                onClick={() => onReject(token)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const QueueTab = ({ items, onComplete, onSelect }: { items: Token[]; onComplete: (id: string) => void; onSelect: (token: Token) => void }) => {
  if (items.length === 0) return <EmptyState message="Queue is empty" />;
  return (
    <div className="space-y-6">
      {/* --- FIX: Filter out null/undefined items --- */}
      {items.filter(Boolean).map(token => (
        <VendorQueueCard
          key={token.id}
          token={token}
          onComplete={onComplete}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

// --- Reject Modal (New) ---

const RejectTokenModal = ({ token, onClose, onReject }: { token: Token; onClose: () => void; onReject: (id: string, message?: string) => void }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onReject(token.id, message || undefined);
    setLoading(false);
  };

  return (
    <Modal title="Reject Request" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-zinc-700 dark:text-zinc-300">
          You are rejecting the request for <strong>{token.serviceType}</strong> from <strong>{token.user?.name}</strong>.
        </p>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Reason (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            rows={3}
            placeholder="e.g., Service currently unavailable"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : 'Reject Request'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

