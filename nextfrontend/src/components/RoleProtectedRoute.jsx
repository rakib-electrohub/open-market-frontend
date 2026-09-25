import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from "@/lib/next-router";
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { apiClient } from '@/api/apiClient';

const PATH_TO_PERMISSION = {
  '/admin/orders': 'orders',
  '/admin/products': 'products',
  '/admin/sellers': 'sellers',
  '/admin/flash-sales': 'flash_sales',
  '/admin/coupons': 'coupons',
  '/admin/staff': 'staff',
  '/admin/messages': 'messages',
  '/admin/reviews': 'reviews',
  '/admin/chats': 'chats',
  '/admin/users': 'users',
  '/admin/faq': 'faq',
  '/admin/inventory': 'inventory',
  '/admin/analytics': 'analytics',
  '/admin/banners': 'banners',
  '/admin/settings': 'settings',
};

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function RoleProtectedRoute({
  allowedRoles = [],
  fallback = <DefaultFallback />,
  unauthenticatedElement = <Navigate to="/login" replace />,
  unauthorizedElement = <Navigate to="/" replace />,
}) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
  const location = useLocation();
  const [staffPermissionState, setStaffPermissionState] = useState('not-applicable');
  const [staffPermissions, setStaffPermissions] = useState([]);
  const routePermission = PATH_TO_PERMISSION[location.pathname] || null;
  const isStaffDashboardRoute = location.pathname === '/staff';

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  useEffect(() => {
    if (!user || !allowedRoles.includes('staff') || !['staff', 'employee'].includes(user?.role)) {
      setStaffPermissionState('not-applicable');
      setStaffPermissions([]);
      return;
    }

    if (isStaffDashboardRoute) {
      setStaffPermissions([]);
      setStaffPermissionState('allowed');
      return;
    }

    let isCancelled = false;
    setStaffPermissionState('checking');
    apiClient.entities.StaffPermission.filter({ user_email: user.email, is_active: true })
      .then((permissionRecords) => {
        if (isCancelled) return;
        const permissions = Array.isArray(permissionRecords)
          ? permissionRecords.flatMap((entry) => Array.isArray(entry.permissions) ? entry.permissions : [])
          : [];
        setStaffPermissions(permissions);
        const hasRequiredPermission = routePermission ? permissions.includes(routePermission) : permissions.length > 0;
        setStaffPermissionState(hasRequiredPermission ? 'allowed' : 'blocked');
      })
      .catch(() => {
        if (!isCancelled) {
          setStaffPermissions([]);
          setStaffPermissionState('blocked');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user, allowedRoles, routePermission, isStaffDashboardRoute]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  const normalizedRole = user?.role;
  const isAdminRole = normalizedRole === 'admin';
  const isStaffLikeRole = ['staff', 'employee'].includes(normalizedRole);
  const isAllowedRole = allowedRoles.length > 0 && (
    isAdminRole ||
    (isStaffLikeRole && allowedRoles.includes('staff') && (isStaffDashboardRoute || staffPermissionState === 'allowed'))
  );
  const isStaffPermissionPending = allowedRoles.includes('staff') && isStaffLikeRole && !isStaffDashboardRoute && ['checking', 'not-applicable'].includes(staffPermissionState);

  if (isStaffPermissionPending) {
    return fallback;
  }

  if (allowedRoles.includes('staff') && isStaffLikeRole && staffPermissionState === 'blocked') {
    return unauthorizedElement;
  }

  if (allowedRoles.length > 0 && !isAllowedRole) {
    return unauthorizedElement;
  }

  return <Outlet />;
}
