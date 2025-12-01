import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { SegmentedControl } from '../ui/SegmentedControl';

const segments = [
  { label: 'Chores', to: '/admin/tasks/chores' },
  { label: 'Schedule', to: '/admin/tasks/schedule' },
];

export function TasksLayout() {
  const location = useLocation();

  // Redirect /admin/tasks to /admin/tasks/chores
  if (location.pathname === '/admin/tasks') {
    return <Navigate to="/admin/tasks/chores" replace />;
  }

  return (
    <div>
      <div className="mb-4">
        <SegmentedControl items={segments} />
      </div>
      <Outlet />
    </div>
  );
}
