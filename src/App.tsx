import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import CitizenAuth from './pages/CitizenAuth';
import AdminLogin from './pages/AdminLogin';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import CommunityReports from './pages/CommunityReports';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/citizen/auth" element={<CitizenAuth />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/citizen/dashboard"
            element={
              <ProtectedRoute redirectTo="/citizen/auth">
                <UserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/community-reports"
            element={
              <ProtectedRoute redirectTo="/citizen/auth">
                <CommunityReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute redirectTo="/admin/login" requireAdmin>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
