/* eslint-disable react-refresh/only-export-components -- route config module, not a component file */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from '@/guards/ProtectedRoute';
import MainLayout from '@/layouts/MainLayout';

// Lazy-loaded pages → code splitting.
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const RoomsPage = lazy(() => import('@/pages/rooms/RoomsPage'));
const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'));
const FeesPage = lazy(() => import('@/pages/fees/FeesPage'));
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'));
const EmployeesPage = lazy(() => import('@/pages/employees/EmployeesPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function Loading() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

const wrap = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>;

export const router = createBrowserRouter([
  { path: '/login', element: wrap(<LoginPage />) },
  { path: '/forgot-password', element: wrap(<ForgotPasswordPage />) },
  { path: '/reset-password', element: wrap(<ResetPasswordPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: wrap(<DashboardPage />) },
          { path: '/rooms', element: wrap(<RoomsPage />) },
          { path: '/students', element: wrap(<StudentsPage />) },
          { path: '/fees', element: wrap(<FeesPage />) },
          { path: '/expenses', element: wrap(<ExpensesPage />) },
          { path: '/employees', element: wrap(<EmployeesPage />) },
          { path: '/reports', element: wrap(<ReportsPage />) },
          { path: '/settings', element: wrap(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '/404', element: wrap(<NotFoundPage />) },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
