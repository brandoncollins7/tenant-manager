import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { adminsApi } from '../../api/admins';
import type { Admin, AdminRole, Unit } from '../../types';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAdmin?: Admin | null;
  units: Unit[];
}

export function AddAdminModal({
  isOpen,
  onClose,
  onSuccess,
  editingAdmin,
  units,
}: AddAdminModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('PROPERTY_MANAGER');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingAdmin) {
      setEmail(editingAdmin.email);
      setName(editingAdmin.name);
      setRole(editingAdmin.role);
      setSelectedUnitIds(
        editingAdmin.unitAssignments?.map((a) => a.unitId) || []
      );
    } else {
      setEmail('');
      setName('');
      setRole('PROPERTY_MANAGER');
      setSelectedUnitIds([]);
    }
    setError('');
  }, [editingAdmin, isOpen]);

  const handleUnitToggle = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const adminData = {
        email: email.trim(),
        name: name.trim(),
        role,
        unitIds: selectedUnitIds.length > 0 ? selectedUnitIds : undefined,
      };

      if (editingAdmin) {
        await adminsApi.update(editingAdmin.id, adminData);
      } else {
        await adminsApi.create(adminData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingAdmin ? 'Edit Admin' : 'Add Admin'}
      trackingId={editingAdmin ? 'edit-admin' : 'add-admin'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="PROPERTY_MANAGER">Property Manager</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>

        {role === 'PROPERTY_MANAGER' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned Units
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {units.length === 0 ? (
                <p className="text-sm text-gray-500">No units available</p>
              ) : (
                units.map((unit) => (
                  <label
                    key={unit.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnitIds.includes(unit.id)}
                      onChange={() => handleUnitToggle(unit.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{unit.name}</span>
                  </label>
                ))
              )}
            </div>
            {role === 'PROPERTY_MANAGER' && selectedUnitIds.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Property managers should be assigned to at least one unit
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingAdmin ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
