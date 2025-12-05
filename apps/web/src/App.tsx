import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { usePageTracking } from './hooks/usePageTracking';
import { MobileLayout } from './components/layout/MobileLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { TasksLayout } from './components/layout/TasksLayout';
import { DevEmailListener } from './components/dev/DevEmailListener';
import { LoginPage } from './pages/LoginPage';
import { VerifyPage } from './pages/VerifyPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChoresPage } from './pages/ChoresPage';
import { SwapsPage } from './pages/SwapsPage';
import { RequestsPage } from './pages/RequestsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminRequestsPage } from './pages/admin/AdminRequestsPage';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage';
import { AdminChoresPage } from './pages/admin/AdminChoresPage';
import { AdminUnitsPage } from './pages/admin/AdminUnitsPage';
import { AdminUnitDetailPage } from './pages/admin/AdminUnitDetailPage';
import { AdminRoomDetailPage } from './pages/admin/AdminRoomDetailPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { WelcomePage } from './pages/WelcomePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect admin users to admin dashboard
  if (user?.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect non-admin users to tenant dashboard
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={user?.isAdmin ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
}

// Wrapper component for routes content
function AppRoutes() {
  usePageTracking(); // Track page views on route changes

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/welcome" element={<WelcomePage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="requests" element={<AdminRequestsPage />} />
        <Route path="concerns" element={<Navigate to="/admin/requests" replace />} />
        <Route path="users" element={<AdminUsersPage />} />

        {/* Units routes */}
        <Route path="units" element={<AdminUnitsPage />} />
        <Route path="units/:unitId" element={<AdminUnitDetailPage />} />
        <Route path="units/:unitId/rooms/:roomId" element={<AdminRoomDetailPage />} />

        {/* Tasks nested routes */}
        <Route path="tasks" element={<TasksLayout />}>
          <Route path="chores" element={<AdminChoresPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
        </Route>
      </Route>

      {/* Protected tenant routes */}
      <Route
        element={
          <ProtectedRoute>
            <MobileLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="chores" element={<ChoresPage />} />
        <Route path="swaps" element={<SwapsPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="concerns" element={<Navigate to="/requests" replace />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <DevEmailListener />
    </BrowserRouter>
  );
}
