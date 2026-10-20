import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import IdleTimeout from './components/IdleTimeout';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import SignInConsent from './pages/SignInConsent';
import Dashboard from './pages/Dashboard';
import UserDashboard from './pages/UserDashboard';
import AdminClinic from './pages/AdminClinic';
import Patients from './pages/Patients';
import MyPets from './pages/MyPets';
import MedicalRecords from './pages/MedicalRecords';
import Appointments from './pages/Appointments';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';
import { isAdmin, isFullAdmin } from './utils/auth';
import Management from './pages/Management';
import './App.css';

// Main layout wrapper displaying the sidebar on all inner pages
const MainDashboardLayout = () => {
  return (
    <div className="app-container">
      <IdleTimeout />
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

// Protected route guard checking token on navigation
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <MainDashboardLayout />;
};

// Admin-only gate
const AdminRoute = ({ children }) => {
  return isAdmin() ? children : <Navigate to="/my-pets" replace />;
};

// Clinic Admin only (Veterinary Staff are sent back to the dashboard)
const FullAdminRoute = ({ children }) => {
  return isFullAdmin() ? children : <Navigate to="/dashboard" replace />;
};

// Pet-owner-only gate
const OwnerRoute = ({ children }) => {
  return isAdmin() ? <Navigate to="/dashboard" replace /> : children;
};

// Role-based Dashboard component
const DynamicDashboard = () => {
  return isAdmin() ? <Dashboard /> : <UserDashboard />;
};

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<HomePage />} />

        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Before Sign Up: Show Consent First */}
        <Route path="/consent" element={<SignInConsent />} />
        
        {/* Registration Form */}
        <Route path="/register" element={<Register />} />

        {/*Enter the OTP emailed after registering */}
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Forgot password: email -> emailed code -> new password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DynamicDashboard />} />
          <Route path="/admin" element={<AdminRoute><AdminClinic /></AdminRoute>} />
          <Route path="/manage" element={<FullAdminRoute><Management /></FullAdminRoute>} />
          <Route path="/patients" element={<AdminRoute><Patients /></AdminRoute>} />
          <Route path="/my-pets" element={<OwnerRoute><MyPets /></OwnerRoute>} />
          <Route path="/medical-records" element={<MedicalRecords />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/profile" element={<Profile />} />


          <Route path="/settings" element={<Navigate to="/profile" replace />} />
        </Route>

        {/*Catch all redirects back to the homepage*/}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;