import { useEffect, useState } from 'react';
import { Token, TokenStatus } from '../types/index';

interface VendorQueueCardProps {
  token: Token;
  onComplete: (tokenId: string) => void;
  onSelect: (token: Token) => void;
}

const useCountdown = (isoEta: string | null) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  useEffect(() => {
    if (!isoEta) return;
    const update = () => {
      const diff = new Date(isoEta).getTime() - Date.now();
      if (diff <= 0) { setTimeRemaining('Overdue'); return; }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        setTimeRemaining(`${hours}h ${minutes % 60}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isoEta]);
  return timeRemaining;
};

export default function VendorQueueCard({ token, onComplete, onSelect }: VendorQueueCardProps) {
  const timeRemaining = useCountdown(token?.estimatedCompletion || null);

  // --- FIX: Add guard for undefined/null token ---
  // This prevents a crash if the component is rendered with no token.
  if (!token) {
    return null;
  }

  const statusColors: Record<TokenStatus, string> = {
    QUEUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    CANCELLED: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
  };

  return (
    <div className="rounded-xl border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b dark:border-zinc-700">
        <div 
          className="flex items-center gap-3 mb-3 sm:mb-0 cursor-pointer"
          onClick={() => onSelect(token)}
        >
          <span className="text-3xl font-bold text-blue-500">
            #{token.queuePosition}
          </span>
          <h3 className="text-xl font-bold capitalize text-zinc-900 dark:text-zinc-100">
            {token.serviceType}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[token.status]}`}>
            {token.status.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={() => onComplete(token.id)}
          className="w-full sm:w-auto px-5 py-2.5 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600 transition duration-200"
        >
          Mark Complete
        </button>
      </div>
      
      <div 
        className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 cursor-pointer"
        onClick={() => onSelect(token)}
      >
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Customer</h4>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{token.user?.name || 'N/A'}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{token.user?.email || 'N/A'}</p>
        </div>
        
        {token.params && Object.keys(token.params).length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">Details</h4>
            <div className="space-y-0.5">
              {Object.entries(token.params).map(([key, value]) => (
                <p key={key} className="text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="capitalize">{key}:</span>{' '}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{String(value)}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {token.estimatedCompletion && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase">ETA</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeRemaining}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {new Date(token.estimatedCompletion).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

