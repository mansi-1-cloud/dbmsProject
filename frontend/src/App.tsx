import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import VendorDashboard from './pages/VendorDashboard';
import UserProfile from './pages/UserProfile';
import VendorProfile from './pages/VendorProfile';

function App() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route 
          path="/user/dashboard" 
          element={
            isAuthenticated() && user?.role === 'USER' 
              ? <UserDashboard /> 
              : <Navigate to="/login" />
          } 
        />
        
        <Route 
          path="/user/profile" 
          element={
            isAuthenticated() && user?.role === 'USER' 
              ? <UserProfile /> 
              : <Navigate to="/login" />
          } 
        />
        
        <Route 
          path="/vendor/dashboard" 
          element={
            isAuthenticated() && user?.role === 'VENDOR' 
              ? <VendorDashboard /> 
              : <Navigate to="/login" />
          } 
        />
        
        <Route 
          path="/vendor/profile" 
          element={
            isAuthenticated() && user?.role === 'VENDOR' 
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
