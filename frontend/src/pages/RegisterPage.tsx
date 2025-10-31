import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Use new Jotai auth hook
import { api } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ThemeToggle } from '../components/ThemeToggle';

const SERVICE_OPTIONS = ['printing', 'binding', 'lamination', 'scanning', 'photocopying'];

export default function RegisterPage() {
  const [role, setRole] = useState<'USER' | 'VENDOR'>('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  useTheme(); // Initialize theme
  const { setAuth } = useAuth(); // Use new Jotai auth hook
  const navigate = useNavigate();

  const toggleService = (service: string) => {
    setServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (role === 'VENDOR' && services.length === 0) {
        throw new Error('Please select at least one service');
      }

      const result = role === 'USER' 
        ? await api.registerUser(email, name, password)
        : await api.registerVendor(email, name, password, services);

      const userData = role === 'USER' ? result.user : result.vendor;
      setAuth(userData, result.token); // Use new Jotai setAuth
      
      navigate(role === 'USER' ? '/user/dashboard' : '/vendor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-8 w-full max-w-md border dark:border-zinc-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-zinc-900 dark:text-zinc-100">
          Join QueueFlow
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
            label="Name"
            id="name"
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
          />
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
            minLength={6}
            required
          />

          {role === 'VENDOR' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Services Offered
              </label>
              <div className="space-y-2">
                {SERVICE_OPTIONS.map(service => (
                  <label key={service} className="flex items-center text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={services.includes(service)}
                      onChange={() => toggleService(service)}
                      className="mr-2 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700"
                    />
                    <span className="capitalize">{service}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-3 rounded-lg font-semibold transition disabled:opacity-50
              ${role === 'USER' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
              flex justify-center items-center h-[48px]
            `}
          >
            {loading ? <LoadingSpinner /> : 'Register'}
          </button>
        </form>

        <p className="text-center mt-6 text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
            Login here
          </Link>
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

