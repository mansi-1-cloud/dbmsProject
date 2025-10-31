import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import VendorDashboard from './pages/VendorDashboard';
import UserProfile from './pages/UserProfile';
import VendorProfile from './pages/VendorProfile';
import HeroSectionOne from './components/hero-section-demo-1';
import { FollowerPointerCard, FollowPointer } from './components/ui/following-pointer';

function App() {
  const { user, isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="hero" element={<HeroSectionOne/>} />

        <Route path='following' element={<FollowerPointerCard{,,"Garv"}/>} />
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
              : <Navigate to="/login" />
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
