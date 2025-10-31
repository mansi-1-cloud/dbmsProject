    import { useEffect, useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useAuth } from '../hooks/useAuth'; // Use new Jotai auth hook
    import { api } from '../services/api';
    import { socket } from '../services/socket';
    import { Token } from '../types';
    import { useTheme } from '../hooks/useTheme';
    import { ThemeToggle } from '../components/ThemeToggle';
    import { PageLoader } from '../components/LoadingSpinner';
    import TokenCard from '../components/TokenCard';
    import CreateTokenModal from '../components/CreateTokenModal';
    import TokenDetailModal from '../components/TokenDetailModal';
    import ConfirmModal from '../components/ConfirmModal';
    import { UserIcon, LogoutIcon, PlusIcon } from '../components/Icons'; // Use SVG Icons

    // Type for the confirmation modal state
    type ConfirmState = {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    loading: boolean;
    };

    export default function UserDashboard() {
    const { user, logout } = useAuth(); // Use new Jotai auth hook
    const navigate = useNavigate();
    useTheme(); // Initialize theme

    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
    const [confirm, setConfirm] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        loading: false,
    });

    useEffect(() => {
        loadTokens();
        
        socket.connect();
        socket.emit('joinRoom', `user_${user?.id}`);

        const handleTokenUpdate = (updatedToken: Token) => {
        setTokens(prev => prev.map(t => t.id === updatedToken.id ? updatedToken : t));
        };

        socket.on('token.updated', handleTokenUpdate);

        return () => {
        socket.off('token.updated', handleTokenUpdate);
        socket.emit('leaveRoom', `user_${user?.id}`);
        };
    }, [user?.id]);

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
        logout(); // Use new Jotai logout
        navigate('/');
    };

    const handleTokenCreated = (newToken: Token) => {
        setTokens(prev => [newToken, ...prev]);
        setShowCreateModal(false);
    };

    // --- Functions for new Confirm Modal ---
    const closeConfirmModal = () => {
        setConfirm({ ...confirm, isOpen: false, loading: false });
    };

    const openCancelConfirm = (token: Token) => {
        setConfirm({
        isOpen: true,
        title: 'Cancel Request',
        message: 'Are you sure you want to cancel this service request?',
        onConfirm: () => _handleCancelToken(token.id),
        loading: false,
        });
    };

    const openDeleteConfirm = (token: Token) => {
        setConfirm({
        isOpen: true,
        title: 'Delete Request',
        message: 'Are you sure you want to delete this request from your history?',
        onConfirm: () => _handleDeleteToken(token.id),
        loading: false,
        });
    };

    const _handleCancelToken = async (tokenId: string) => {
        setConfirm(prev => ({ ...prev, loading: true }));
        try {
        const updatedToken = await api.cancelToken(tokenId);
        setTokens(prev => prev.map(t => t.id === tokenId ? updatedToken : t));
        } catch (error) {
        console.error('Failed to cancel token:', error);
        } finally {
        closeConfirmModal();
        }
    };

    const _handleDeleteToken = async (tokenId: string) => {
        setConfirm(prev => ({ ...prev, loading: true }));
        try {
        await api.deleteToken(tokenId);
        setTokens(prev => prev.filter(t => t.id !== tokenId));
        } catch (error) {
        console.error('Failed to delete token:', error);
        } finally {
        closeConfirmModal();
        }
    };
    // --- End of Confirm Modal functions ---

    const activeTokens = tokens.filter(t => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(t.status));
    const completedTokens = tokens.filter(t => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(t.status));
    const tokensToShow = activeTab === 'active' ? activeTokens : completedTokens;

    if (loading) {
        return <PageLoader />;
    }

    return (
        <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-800 shadow-sm border-b dark:border-zinc-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold">QueueFlow</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Welcome, {user?.name}!</p>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                onClick={() => navigate('/user/profile')}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
                title="Profile"
                >
                <UserIcon />
                </button>
                <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
                title="Logout"
                >
                <LogoutIcon />
                </button>
                <button
                onClick={() => setShowCreateModal(true)}
                className="ml-2 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                <PlusIcon />
                New Request
                </button>
            </div>
            </div>
            {/* Tabs */}
            <div className="container mx-auto px-4">
            <div className="flex gap-4">
                <TabButton
                isActive={activeTab === 'active'}
                onClick={() => setActiveTab('active')}
                count={activeTokens.length}
                >
                Active
                </TabButton>
                <TabButton
                isActive={activeTab === 'completed'}
                onClick={() => setActiveTab('completed')}
                count={completedTokens.length}
                >
                History
                </TabButton>
            </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
            {tokensToShow.length === 0 ? (
            <EmptyState
                tab={activeTab}
                onCreateClick={() => setShowCreateModal(true)}
            />
            ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tokensToShow.map(token => (
                <div key={token.id} className="relative group">
                    <TokenCard token={token} onSelect={() => setSelectedToken(token)} />
                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {['PENDING', 'QUEUED', 'IN_PROGRESS'].includes(token.status) && (
                        <ActionButton
                        onClick={() => openCancelConfirm(token)}
                        label="Cancel"
                        className="bg-red-600 hover:bg-red-700"
                        />
                    )}
                    {token.status === 'COMPLETED' && (
                        <ActionButton
                        onClick={() => openDeleteConfirm(token)}
                        label="Delete"
                        className="bg-zinc-600 hover:bg-zinc-700"
                        />
                    )}
                    </div>
                </div>
                ))}
            </div>
            )}
        </main>

        {/* Modals */}
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

        {confirm.isOpen && (
            <ConfirmModal
            title={confirm.title}
            message={confirm.message}
            onClose={closeConfirmModal}
            onConfirm={confirm.onConfirm}
            loading={confirm.loading}
            />
        )}
        </div>
    );
    }

    // Sub-components
    const TabButton = ({ isActive, onClick, count, children }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-1 py-4 font-semibold transition ${
        isActive
            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
        }`}
    >
        {children}
        <span className={`px-2 py-0.5 rounded-full text-xs ${
        isActive ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-zinc-200 dark:bg-zinc-700'
        }`}>
        {count}
        </span>
    </button>
    );

    const EmptyState = ({ tab, onCreateClick }: any) => (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-12 text-center border dark:border-zinc-700">
        <h3 className="text-xl text-zinc-600 dark:text-zinc-300 mb-4">
        {tab === 'active' ? 'No active requests' : 'No completed requests yet'}
        </h3>
        {tab === 'active' && (
        <button
            onClick={onCreateClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
            Create Your First Request
        </button>
        )}
    </div>
    );

    const ActionButton = ({ onClick, label, className }: any) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`px-3 py-1 text-white text-xs rounded-full shadow-lg transition ${className}`}
    >
        {label}
    </button>
    );

