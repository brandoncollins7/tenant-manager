import { NavLink } from 'react-router-dom';

interface SegmentItem {
  label: string;
  to: string;
}

interface SegmentedControlProps {
  items: SegmentItem[];
}

export function SegmentedControl({ items }: SegmentedControlProps) {
  return (
    <div className="bg-gray-100 p-1 rounded-lg inline-flex">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-4 py-2 text-sm font-medium rounded-md transition-all ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
