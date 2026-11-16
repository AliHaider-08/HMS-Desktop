import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RouteError } from './components/RouteError';
import { LoginPage } from './pages/Login/LoginPage';
import { ChangePasswordPage } from './pages/Login/ChangePasswordPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { PlaceholderPage } from './pages/Placeholder/PlaceholderPage';

/**
 * Hash routing is used because the packaged app runs from file://.
 * Every page inside the layout is wrapped in ProtectedRoute with its PageKey.
 */
export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/change-password',
    element: (
      <ProtectedRoute allowPendingPasswordChange>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredPage="home">
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredPage="reports">
            <PlaceholderPage page="reports" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredPage="users">
            <PlaceholderPage page="users" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute requiredPage="settings">
            <PlaceholderPage page="settings" />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
