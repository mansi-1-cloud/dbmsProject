import { useEffect, useState } from 'react';
import { Token, TokenStatus } from '../types';

interface TokenCardProps {
  token: Token;
  onClick?: () => void; // For opening detail modal
  onSelect?: () => void; // Alternative prop name
}

const STATUS_COLORS: Record<TokenStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  QUEUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
};

const useCountdown = (isoEta: string | null) => {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!isoEta) return;

    const updateCountdown = () => {
      const eta = new Date(isoEta);
      const diff = eta.getTime() - new Date().getTime();

      if (diff <= 0) {
        setTimeRemaining('Overdue');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setTimeRemaining(`${hours}h ${mins}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isoEta]);

  return timeRemaining;
};

export default function TokenCard({ token, onClick, onSelect }: TokenCardProps) {
  const timeRemaining = useCountdown(token.estimatedCompletion);
  const status = token.status ?? 'PENDING';
  const handleClick = onClick || onSelect;

  return (
    <div 
      className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-5 hover:shadow-lg transition cursor-pointer border border-zinc-200 dark:border-zinc-700"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold capitalize text-zinc-900 dark:text-zinc-100">{token.serviceType}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status]}`}>
          {status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        <p><strong>Vendor:</strong> {token.vendor?.name || 'N/A'}</p>
        <p><strong>Requested:</strong> {new Date(token.createdAt).toLocaleString()}</p>
        
        {token.queuePosition && (
          <p><strong>Queue Position:</strong> <span className="font-bold text-zinc-900 dark:text-zinc-100">#{token.queuePosition}</span></p>
        )}

        {token.vendorMessage && (
          <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">Message from Vendor:</p>
            <p className="text-sm mt-1">{token.vendorMessage}</p>
          </div>
        )}
      </div>

      {token.estimatedCompletion && ['QUEUED', 'IN_PROGRESS'].includes(token.status) && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-1">Estimated Completion:</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{timeRemaining}</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            {new Date(token.estimatedCompletion).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
