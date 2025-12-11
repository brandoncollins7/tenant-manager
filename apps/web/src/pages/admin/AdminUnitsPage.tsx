import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building, ChevronRight, Users, DoorOpen, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedList, FadeIn } from '../../components/ui/AnimatedList';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { apiClient } from '../../api/client';
import { extractErrorMessage } from '../../utils/errors';

interface Unit {
  id: string;
  name: string;
  timezone: string;
  _count: {
    rooms: number;
    tenants?: number;
  };
}

export function AdminUnitsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({ name: '', timezone: 'America/Toronto' });
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);

  const { data: units, isLoading } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await apiClient.get('/units');
      return response.data;
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: typeof unitForm) => {
      await apiClient.post('/units', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleCloseModal();
      toast.success('Unit created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof unitForm }) => {
      await apiClient.patch(`/units/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      handleCloseModal();
      toast.success('Unit updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: string) => {
      await apiClient.delete(`/units/${unitId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setUnitToDelete(null);
      toast.success('Unit deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleOpenEditModal = (unit: Unit, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUnit(unit);
    setUnitForm({ name: unit.name, timezone: unit.timezone });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
    setUnitForm({ name: '', timezone: 'America/Toronto' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, data: unitForm });
    } else {
      createUnitMutation.mutate(unitForm);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Units</h1>
          <p className="text-gray-600">Manage your properties</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </Button>
      </div>

      {/* Units Grid */}
      {units?.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Building className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 mb-4">No units yet. Add your first unit to get started.</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </CardBody>
        </Card>
      ) : (
        <AnimatedList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units?.map((unit) => (
            <Card
              key={unit.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/admin/units/${unit.id}`)}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Building className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{unit.name}</h3>
                      <p className="text-sm text-gray-500">{unit.timezone}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <DoorOpen className="w-4 h-4" />
                    {unit._count.rooms} rooms
                  </span>
                  {unit._count.tenants !== undefined && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {unit._count.tenants} tenants
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleOpenEditModal(unit, e)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit unit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnitToDelete(unit);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </AnimatedList>
      )}

      {/* Add/Edit Unit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUnit ? 'Edit Unit' : 'Add New Unit'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Unit Name"
            value={unitForm.name}
            onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
            placeholder="123 Main St - Unit 4B"
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={unitForm.timezone}
              onChange={(e) => setUnitForm({ ...unitForm, timezone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
            >
              <option value="America/Toronto">America/Toronto (EST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Denver">America/Denver (MST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={(createUnitMutation.isPending || updateUnitMutation.isPending) || !unitForm.name}
            >
              {createUnitMutation.isPending || updateUnitMutation.isPending
                ? (editingUnit ? 'Updating...' : 'Creating...')
                : (editingUnit ? 'Update Unit' : 'Create Unit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Unit Confirmation */}
      <Modal
        isOpen={!!unitToDelete}
        onClose={() => setUnitToDelete(null)}
        title="Delete Unit"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{unitToDelete?.name}</strong>?
            This will also delete all rooms and tenant associations.
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setUnitToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => unitToDelete && deleteUnitMutation.mutate(unitToDelete.id)}
              className="flex-1"
              disabled={deleteUnitMutation.isPending}
            >
              {deleteUnitMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </FadeIn>
  );
}
