import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { Loading } from '../ui/Loading';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, initialized, loading } = useAuthStore();

  // إذا لم يكتمل التهيئة → أظهر شاشة تحميل
  if (!initialized || loading) {
    return <Loading fullScreen message="جاري التحقق من الجلسة..." />;
  }

  // إذا لم يكن هناك مستخدم → وجّهه للـ Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // المستخدم مسجّل → أظهر المحتوى
  return <>{children}</>;
}