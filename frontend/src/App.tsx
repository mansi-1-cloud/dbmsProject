import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import UserProfile from './pages/UserProfile';
import VendorProfile from './pages/VendorProfile';
import { VendorDashboard } from './pages/VendorDash';
import { SignupPage } from './pages/SignupPage';
import { LoginPage } from './pages/LoginPage';
import HeroSection from './components/hero-section-demo-1';
import { UserDashboard } from './pages/UserDashboard';

function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/hero" element={<HeroSection />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route 
          path="/user/dashboard" 
          element={
            isAuthenticated && user?.role === 'USER' 
              ? <UserDashboard /> 
              : <Navigate to="/login" />
          } 
        />
        
        <Route 
          path="/user/profile" 
          element={
            isAuthenticated && user?.role === 'USER' 
              ? <UserProfile /> 
              : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/vendor/dashboard" 
          element={
            isAuthenticated && user?.role === 'VENDOR' 
              ? <VendorDashboard /> 
              : <Navigate to="/hero" />
          } 
        />
        
        <Route 
          path="/vendor/profile" 
          element={
            isAuthenticated && user?.role === 'VENDOR' 
              ? <VendorProfile /> 
              : <Navigate to="/login" />
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
