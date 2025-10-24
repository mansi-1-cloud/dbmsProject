import { useEffect, useState } from 'react';

interface VendorQueueCardProps {
  token: any;
  onComplete: (tokenId: string) => void;
}

export default function VendorQueueCard({ token, onComplete }: VendorQueueCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!token.estimatedCompletion) return;

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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-blue-600">#{token.queuePosition}</span>
            <h3 className="text-xl font-bold capitalize">{token.serviceType}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              token.status === 'IN_PROGRESS' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {token.status}
            </span>
          </div>
          
          <p className="text-gray-600 mb-1">
            Customer: {token.user.name} ({token.user.email})
          </p>
          
          {token.params && Object.keys(token.params).length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <strong>Details:</strong>
              <div className="ml-2 mt-1">
                {Object.entries(token.params).map(([key, value]) => (
                  <p key={key}>{key}: {String(value)}</p>
                ))}
              </div>
            </div>
          )}

          {token.estimatedCompletion && (
            <div className="mt-3 inline-block px-4 py-2 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">ETA: <span className="font-bold text-blue-600">{timeRemaining}</span></p>
              <p className="text-xs text-gray-500">{new Date(token.estimatedCompletion).toLocaleString()}</p>
            </div>
          )}
        </div>
        
        <button
          onClick={() => onComplete(token.id)}
          className="ml-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
        >
          Mark Complete
        </button>
      </div>
    </div>
  );
}
