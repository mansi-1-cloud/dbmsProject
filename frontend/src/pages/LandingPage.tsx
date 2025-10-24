import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function LandingPage() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-12">
          <h1 className="text-6xl font-bold mb-4">QueueFlow</h1>
          <p className="text-2xl mb-8">Real-Time Queue & Appointment Scheduling Platform</p>
          <p className="text-lg mb-8">Manage service requests with intelligent token-based queuing</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="text-4xl mb-4">🎫</div>
              <h3 className="text-xl font-bold mb-2">Request Service</h3>
              <p className="text-gray-600">Create tokens for printing, binding, and more</p>
            </div>
            
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-xl font-bold mb-2">Real-Time Updates</h3>
              <p className="text-gray-600">Track your position and ETA live</p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Smart Queue</h3>
              <p className="text-gray-600">FIFO scheduling with live countdown</p>
            </div>
          </div>

          {isAuthenticated() ? (
            <div className="text-center">
              <p className="mb-4 text-lg">Welcome back, <span className="font-bold">{user?.name}</span>!</p>
              <Link 
                to={user?.role === 'VENDOR' ? '/vendor/dashboard' : '/user/dashboard'}
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link 
                to="/login"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Login
              </Link>
              <Link 
                to="/register"
                className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
