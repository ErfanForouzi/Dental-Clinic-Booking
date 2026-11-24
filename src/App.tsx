import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthGuard } from './components/admin/AdminAuthGuard';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { PublicClinicPage } from './pages/PublicClinicPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AppointmentsPage } from './pages/admin/AppointmentsPage';
import { BlockedDatesPage } from './pages/admin/BlockedDatesPage';
import { BusinessHoursPage } from './pages/admin/BusinessHoursPage';
import { ClinicSettingsPage } from './pages/admin/ClinicSettingsPage';
import { OverviewPage } from './pages/admin/OverviewPage';
import { ServicesPage } from './pages/admin/ServicesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Public Dental Clinic Website (No Login Required) */}
          <Route path="/" element={<PublicClinicPage />} />

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Dashboard Routes */}
          <Route path="/admin" element={<AdminAuthGuard />}>
            <Route index element={<OverviewPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="hours" element={<BusinessHoursPage />} />
            <Route path="blocked-dates" element={<BlockedDatesPage />} />
            <Route path="settings" element={<ClinicSettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
