import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../api/client';
import { extractErrorMessage } from '../../utils/errors';

interface ChoreDefinition {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  unitId: string;
}

interface Unit {
  id: string;
  name: string;
}

export function AdminChoresPage() {
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreDefinition | null>(null);
  const [choreForm, setChoreForm] = useState({
    name: '',
    description: '',
  });
  const [choreToDelete, setChoreToDelete] = useState<ChoreDefinition | null>(null);
  const queryClient = useQueryClient();

  const { data: units } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await apiClient.get('/units');
      return response.data;
    },
  });

  // Auto-select first unit
  useEffect(() => {
    if (units && units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  const { data: chores, isLoading } = useQuery<ChoreDefinition[]>({
    queryKey: ['chores', selectedUnitId],
    queryFn: async () => {
      const response = await apiClient.get(`/chores?unitId=${selectedUnitId}`);
      return response.data;
    },
    enabled: !!selectedUnitId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      await apiClient.post('/chores/definitions', {
        ...data,
        unitId: selectedUnitId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', selectedUnitId] });
      setShowModal(false);
      setChoreForm({ name: '', description: '' });
      toast.success('Chore created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description?: string } }) => {
      await apiClient.patch(`/chores/definitions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', selectedUnitId] });
      setShowModal(false);
      setEditingChore(null);
      setChoreForm({ name: '', description: '' });
      toast.success('Chore updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/chores/definitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chores', selectedUnitId] });
      setChoreToDelete(null);
      toast.success('Chore deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleOpenModal = (chore?: ChoreDefinition) => {
    if (chore) {
      setEditingChore(chore);
      setChoreForm({
        name: chore.name,
        description: chore.description || '',
      });
    } else {
      setEditingChore(null);
      setChoreForm({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChore) {
      updateMutation.mutate({
        id: editingChore.id,
        data: choreForm,
      });
    } else {
      createMutation.mutate(choreForm);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chore Definitions</h1>
          <p className="text-gray-600">Manage chore types for your units</p>
        </div>
        <div className="flex items-center gap-4">
          {units && units.length > 0 && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Chore
          </Button>
        </div>
      </div>

      {/* Chores List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Chores</h2>
        </CardHeader>
        <CardBody className="p-0">
          {!chores || chores.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">
              No chores defined. Add your first chore to get started.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {chores.map((chore) => (
                <li
                  key={chore.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{chore.name}</p>
                    {chore.description && (
                      <p className="text-sm text-gray-600">{chore.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(chore)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit chore"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChoreToDelete(chore)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete chore"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingChore(null);
          setChoreForm({ name: '', description: '' });
        }}
        title={editingChore ? 'Edit Chore' : 'Add Chore'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Chore Name"
            value={choreForm.name}
            onChange={(e) => setChoreForm({ ...choreForm, name: e.target.value })}
            placeholder="e.g., Kitchen, Bathroom, Living Room"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={choreForm.description}
              onChange={(e) => setChoreForm({ ...choreForm, description: e.target.value })}
              placeholder="Details about this chore..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingChore(null);
                setChoreForm({ name: '', description: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending || updateMutation.isPending || !choreForm.name}
            >
              {createMutation.isPending || updateMutation.isPending
                ? (editingChore ? 'Updating...' : 'Creating...')
                : (editingChore ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!choreToDelete}
        onClose={() => setChoreToDelete(null)}
        title="Delete Chore"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{choreToDelete?.name}</strong>?
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setChoreToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => choreToDelete && deleteMutation.mutate(choreToDelete.id)}
              className="flex-1"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
