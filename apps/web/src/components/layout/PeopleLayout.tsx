import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useAuth } from '../../context/AuthContext';

const segments = [
  { label: 'Tenants', to: '/admin/people/tenants' },
  { label: 'Rooms', to: '/admin/people/rooms' },
];

export function PeopleLayout() {
  const location = useLocation();
  const { user } = useAuth();

  // Add Admins segment for super admins
  const allSegments = user?.role === 'SUPER_ADMIN'
    ? [...segments, { label: 'Admins', to: '/admin/people/admins' }]
    : segments;

  // Redirect /admin/people to /admin/people/tenants
  if (location.pathname === '/admin/people') {
    return <Navigate to="/admin/people/tenants" replace />;
  }

  return (
    <div>
      <div className="mb-4">
        <SegmentedControl items={allSegments} />
      </div>
      <Outlet />
    </div>
  );
}
