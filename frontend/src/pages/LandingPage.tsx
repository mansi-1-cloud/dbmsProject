import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Use new Jotai auth hook

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth(); // Use new Jotai auth hook

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Header */}
      <header className="py-4 px-6 fixed top-0 left-0 right-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">QueueFlow</h1>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            QueueFlow
          </h1>
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-300 mb-8">
            Real-Time Queue & Appointment Scheduling
          </p>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            Manage service requests with an intelligent, token-based queuing
            system. Get real-time updates and estimated wait times.
          </p>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-800/50 rounded-lg shadow-xl p-8 border border-zinc-200 dark:border-zinc-700">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <FeatureCard
              emoji="🎫"
              title="Request Service"
              description="Create tokens for printing, binding, and more."
            />
            <FeatureCard
              emoji="⏱️"
              title="Real-Time Updates"
              description="Track your position and ETA live."
            />
            <FeatureCard
              emoji="📊"
              title="Smart Queue"
              description="FIFO scheduling with a live countdown."
            />
          </div>

          {/* Call to Action */}
          {isAuthenticated ? (
            <div className="text-center">
              <p className="mb-4 text-lg">
                Welcome back, <span className="font-bold">{user?.name}</span>!
              </p>
              <Link
                to={user?.role === 'VENDOR' ? '/vendor/dashboard' : '/user/dashboard'}
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="px-8 py-3 rounded-lg font-semibold text-center bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-8 py-3 rounded-lg font-semibold text-center bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const FeatureCard = ({ emoji, title, description }: { emoji: string; title: string; description: string }) => (
  <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700">
    <div className="text-4xl mb-4">{emoji}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
  </div>
);

