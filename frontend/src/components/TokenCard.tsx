import { useEffect, useState } from 'react';

interface TokenCardProps {
  token: any;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  QUEUED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function TokenCard({ token }: TokenCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    console.log('TokenCard for:', token.id, 'Status:', token.status, 'ETA:', token.estimatedCompletion, 'Position:', token.queuePosition);
    if (!token.estimatedCompletion) {
      console.log('No estimated completion time for token:', token.id);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const eta = new Date(token.estimatedCompletion);
      const diff = eta.getTime() - now.getTime();

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
  }, [token.estimatedCompletion]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold capitalize">{token.serviceType}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[token.status]}`}>
          {token.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p><strong>Vendor:</strong> {token.vendor.name}</p>
        <p><strong>Requested:</strong> {new Date(token.createdAt).toLocaleString()}</p>
        
        {token.queuePosition && (
          <p><strong>Position in Queue:</strong> #{token.queuePosition}</p>
        )}

        {token.params && Object.keys(token.params).length > 0 && (
          <div>
            <strong>Details:</strong>
            <div className="ml-2 mt-1">
              {Object.entries(token.params).map(([key, value]) => (
                <p key={key} className="text-xs">
                  {key}: {String(value)}
                </p>
              ))}
            </div>
          </div>
        )}

        {token.vendorMessage && (
          <div className="mt-2 p-2 bg-gray-50 rounded">
            <strong>Vendor Message:</strong>
            <p className="text-xs mt-1">{token.vendorMessage}</p>
          </div>
        )}
      </div>

      {token.estimatedCompletion && ['QUEUED', 'IN_PROGRESS'].includes(token.status) && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Estimated Completion:</p>
          <p className="text-2xl font-bold text-blue-600">{timeRemaining}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(token.estimatedCompletion).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
