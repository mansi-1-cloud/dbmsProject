import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Use new Jotai auth hook
import { api } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LoginPage() {
  const [role, setRole] = useState<'USER' | 'VENDOR'>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useTheme(); // Initialize theme
  const { setAuth } = useAuth(); // Use new Jotai auth hook
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result =
        role === 'USER'
          ? await api.loginUser(email, password)
          : await api.loginVendor(email, password);

      const userData = role === 'USER' ? result.user : result.vendor;
      setAuth(userData, result.token); // Use new Jotai setAuth

      navigate(role === 'USER' ? '/user/dashboard' : '/vendor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex flex-col items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-8 w-full max-w-md border dark:border-zinc-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-zinc-900 dark:text-zinc-100">
          Login to QueueFlow
        </h1>

        <div className="flex gap-2 mb-6">
          <TabButton
            isActive={role === 'USER'}
            onClick={() => setRole('USER')}
            activeColor="blue"
          >
            User
          </TabButton>
          <TabButton
            isActive={role === 'VENDOR'}
            onClick={() => setRole('VENDOR')}
            activeColor="purple"
          >
            Vendor
          </TabButton>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-3 rounded-lg font-semibold transition disabled:opacity-50
              ${role === 'USER' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
              flex justify-center items-center h-[48px]
            `}
          >
            {loading ? <LoadingSpinner /> : 'Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-zinc-600 dark:text-zinc-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Register here
          </Link>
        </p>

        <p className="text-center mt-4 text-sm text-zinc-500 dark:text-zinc-500">
          Demo: alice@example.com / password123
        </p>
      </div>
    </div>
  );
}

// Reusable components for this form
const TabButton = ({ isActive, onClick, children, activeColor }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
      isActive
        ? `bg-${activeColor}-600 text-white`
        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
    }`}
  >
    {children}
  </button>
);

const Input = ({ label, id, ...props }: any) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
      {label}
    </label>
    <input
      id={id}
      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100"
      {...props}
    />
  </div>
);

