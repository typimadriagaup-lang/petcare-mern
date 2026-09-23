import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UserDashboard from './pages/UserDashboard';
import AdminClinic from './pages/AdminClinic';
import Patients from './pages/Patients';
import MyPets from './pages/MyPets';
import MedicalRecords from './pages/MedicalRecords';
import Appointments from './pages/Appointments';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';
import { isAdmin } from './utils/auth';
import './App.css';

// Main layout wrapper displaying the sidebar on all inner pages
const MainDashboardLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

// Admin-only gate: pet owner accounts get bounced back to My Pets
const AdminRoute = ({ children }) => {
  return isAdmin() ? children : <Navigate to="/my-pets" replace />;
};

// Pet-owner-only gate: admin accounts get bounced back to the Dashboard.
// Admins manage the clinic's pet records via Admin Clinic, not My Pets.
const OwnerRoute = ({ children }) => {
  return isAdmin() ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Default landing page goes straight to Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Unprotected Dashboard Routes */}
        <Route element={<MainDashboardLayout />}>
          {/* Dynamically show Admin Dashboard or User Dashboard depending on role */}
          <Route path="/dashboard" element={isAdmin() ? <Dashboard /> : <UserDashboard />} />
          <Route path="/admin" element={<AdminRoute><AdminClinic /></AdminRoute>} />
          <Route path="/patients" element={<AdminRoute><Patients /></AdminRoute>} />
          <Route path="/my-pets" element={<OwnerRoute><MyPets /></OwnerRoute>} />
          <Route path="/medical-records" element={<MedicalRecords />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/profile" element={<Profile />} />

          {/* Old Settings URL now points at Profile */}
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
        </Route>

        {/* Auth routes kept intact if you need to preview them manually */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Catch-all redirects back to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;