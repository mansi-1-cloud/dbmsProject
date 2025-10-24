import { useEffect, useState } from 'react';

interface TokenDetailModalProps {
  token: any;
  onClose: () => void;
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

export default function TokenDetailModal({ token, onClose }: TokenDetailModalProps) {
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

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [token.estimatedCompletion]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Request Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_COLORS[token.status]}`}>
              {token.status}
            </span>
            {token.queuePosition && (
              <span className="text-sm text-gray-600">
                Position in Queue: <strong>#{token.queuePosition}</strong>
              </span>
            )}
          </div>

          {/* Service Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Service Information</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Service Type:</span>
                <p className="font-medium capitalize text-lg">{token.serviceType}</p>
              </div>
              {token.vendor && (
                <div>
                  <span className="text-sm text-gray-600">Vendor:</span>
                  <p className="font-medium">{token.vendor.name}</p>
                  <p className="text-sm text-gray-500">{token.vendor.email}</p>
                </div>
              )}
              {token.user && (
                <div>
                  <span className="text-sm text-gray-600">Customer:</span>
                  <p className="font-medium">{token.user.name}</p>
                  <p className="text-sm text-gray-500">{token.user.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Request Parameters */}
          {token.params && Object.keys(token.params).length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Request Details</h3>
              <div className="space-y-2">
                {Object.entries(token.params).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <p className="font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Timeline</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Created:</span>
                <p className="font-medium">{new Date(token.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Last Updated:</span>
                <p className="font-medium">{new Date(token.updatedAt).toLocaleString()}</p>
              </div>
              {token.estimatedCompletion && (
                <div>
                  <span className="text-sm text-gray-600">Estimated Completion:</span>
                  <p className="font-medium">{new Date(token.estimatedCompletion).toLocaleString()}</p>
                  {['QUEUED', 'IN_PROGRESS'].includes(token.status) && (
                    <p className="text-blue-600 font-bold mt-1">
                      Time Remaining: {timeRemaining}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Vendor Message */}
          {token.vendorMessage && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Message from Vendor</h3>
              <p className="text-gray-700">{token.vendorMessage}</p>
            </div>
          )}

          {/* Token ID */}
          <div className="text-xs text-gray-500 border-t pt-4">
            <span>Token ID: {token.id}</span>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
