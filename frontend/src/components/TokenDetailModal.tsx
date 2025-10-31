import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Token, TokenStatus } from '../types';

interface TokenDetailModalProps {
  token: Token;
  onClose: () => void;
}

const STATUS_COLORS: Record<TokenStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  QUEUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
};

export default function TokenDetailModal({ token, onClose }: TokenDetailModalProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!token.estimatedCompletion) return;
    const update = () => {
      const diff = new Date(token.estimatedCompletion!).getTime() - Date.now();
      if (diff <= 0) { setTimeRemaining('Overdue'); return; }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      else if (minutes > 0) setTimeRemaining(`${minutes}m ${seconds}s`);
      else setTimeRemaining(`${seconds}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [token.estimatedCompletion]);

  return (
    <Modal title="Request Details" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_COLORS[token.status]}`}>
            {token.status}
          </span>
          {token.queuePosition && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Position in Queue: <strong>#{token.queuePosition}</strong>
            </span>
          )}
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-4 space-y-4">
          <InfoItem label="Service" value={token.serviceType} capitalize />
          <InfoItem label="Subject" value={token.subject} />
          <InfoItem label="Description" value={token.description} preWrap />
          {token.vendor && <InfoItem label="Vendor" value={`${token.vendor.name} (${token.vendor.email})`} />}
          {token.user && <InfoItem label="Customer" value={`${token.user.name} (${token.user.email})`} />}
        </div>

        {token.params && Object.keys(token.params).length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Request Details</h3>
            <div className="space-y-2">
              {Object.entries(token.params).map(([key, value]) => (
                <InfoItem key={key} label={key.replace(/([A-Z])/g, ' $1')} value={String(value)} capitalize />
              ))}
            </div>
          </div>
        )}

        <div className="border dark:border-zinc-700 rounded-lg p-4 space-y-3">
          <h3 className="text-lg font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Timeline</h3>
          <InfoItem label="Created" value={new Date(token.createdAt).toLocaleString()} />
          <InfoItem label="Last Updated" value={new Date(token.updatedAt).toLocaleString()} />
          {token.estimatedCompletion && (
            <div>
              <InfoItem label="Estimated Completion" value={new Date(token.estimatedCompletion).toLocaleString()} />
              {['QUEUED', 'IN_PROGRESS'].includes(token.status) && (
                <p className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                  Time Remaining: {timeRemaining}
                </p>
              )}
            </div>
          )}
        </div>

        {token.vendorMessage && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-yellow-800 dark:text-yellow-200">Message from Vendor</h3>
            <p className="text-zinc-700 dark:text-zinc-200">{token.vendorMessage}</p>
          </div>
        )}

        <div className="text-xs text-zinc-500 dark:text-zinc-500 border-t dark:border-zinc-700 pt-4">
          <span>Token ID: {token.id}</span>
        </div>
      </div>
    </Modal>
  );
}

const InfoItem = ({ label, value, preWrap = false, capitalize = false }: { label: string; value: string | undefined; preWrap?: boolean; capitalize?: boolean }) => (
  <div>
    <span className={`text-sm text-zinc-600 dark:text-zinc-400 ${capitalize ? 'capitalize' : ''}`}>{label}:</span>
    <p className={`font-medium text-zinc-900 dark:text-zinc-100 ${preWrap ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
  </div>
);
