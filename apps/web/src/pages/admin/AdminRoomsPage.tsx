import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Building, DoorOpen, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../api/client';
import { extractErrorMessage } from '../../utils/errors';

interface Unit {
  id: string;
  name: string;
  timezone: string;
  rooms: Room[];
  _count: {
    rooms: number;
    chores: number;
  };
}

interface Room {
  id: string;
  roomNumber: string;
  unitId: string;
  unit: {
    id: string;
    name: string;
  };
  tenant?: {
    id: string;
    email: string;
    isActive: boolean;
  } | null;
}

export function AdminRoomsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [, setSelectedUnitId] = useState<string>('');
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({ name: '', timezone: 'America/Toronto' });
  const [roomForm, setRoomForm] = useState({ unitId: '', roomNumber: '' });
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

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
      setIsUnitModalOpen(false);
      setEditingUnit(null);
      setUnitForm({ name: '', timezone: 'America/Toronto' });
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
      setIsUnitModalOpen(false);
      setEditingUnit(null);
      setUnitForm({ name: '', timezone: 'America/Toronto' });
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

  const createRoomMutation = useMutation({
    mutationFn: async (data: typeof roomForm) => {
      await apiClient.post('/rooms', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['available-rooms'] });
      setIsRoomModalOpen(false);
      setRoomForm({ unitId: '', roomNumber: '' });
      toast.success('Room created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      await apiClient.delete(`/rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['available-rooms'] });
      setRoomToDelete(null);
      toast.success('Room deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleOpenRoomModal = (unitId: string) => {
    setRoomForm({ unitId, roomNumber: '' });
    setSelectedUnitId(unitId);
    setIsRoomModalOpen(true);
  };

  const handleOpenEditUnitModal = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({ name: unit.name, timezone: unit.timezone });
    setIsUnitModalOpen(true);
  };

  const handleSubmitUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, data: unitForm });
    } else {
      createUnitMutation.mutate(unitForm);
    }
  };

  const handleSubmitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    createRoomMutation.mutate(roomForm);
  };

  const handleCloseUnitModal = () => {
    setIsUnitModalOpen(false);
    setEditingUnit(null);
    setUnitForm({ name: '', timezone: 'America/Toronto' });
  };

  const handleCloseRoomModal = () => {
    setIsRoomModalOpen(false);
    setRoomForm({ unitId: '', roomNumber: '' });
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
          <h1 className="text-2xl font-bold text-gray-900">Units & Rooms</h1>
          <p className="text-gray-600">Manage properties and rooms</p>
        </div>
        <Button onClick={() => setIsUnitModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </Button>
      </div>

      {/* Units List */}
      <div className="space-y-4">
        {units?.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8">
              <Building className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No units yet. Add your first unit to get started.</p>
            </CardBody>
          </Card>
        ) : (
          units?.map((unit) => (
            <Card key={unit.id}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-primary-600" />
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{unit.name}</h3>
                        <button
                          onClick={() => handleOpenEditUnitModal(unit)}
                          className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors"
                          title="Edit unit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">{unit.timezone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenRoomModal(unit.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Room
                  </Button>
                  <button
                    onClick={() => setUnitToDelete(unit)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete unit"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardBody>
                {unit.rooms.length === 0 ? (
                  <p className="text-sm text-gray-500">No rooms yet</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {unit.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/admin/rooms/${room.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
                          <div>
                            <span className="font-medium text-gray-900">
                              Room {room.roomNumber}
                            </span>
                            {room.tenant && (
                              <p className="text-xs text-gray-500">
                                {room.tenant.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {!room.tenant && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoomToDelete(room);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Unit Modal */}
      <Modal
        isOpen={isUnitModalOpen}
        onClose={handleCloseUnitModal}
        title={editingUnit ? 'Edit Unit' : 'Add New Unit'}
      >
        <form
          onSubmit={handleSubmitUnit}
          className="space-y-4"
        >
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
              onClick={handleCloseUnitModal}
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

      {/* Add Room Modal */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={handleCloseRoomModal}
        title="Add New Room"
      >
        <form
          onSubmit={handleSubmitRoom}
          className="space-y-4"
        >
          <Input
            label="Room Number"
            value={roomForm.roomNumber}
            onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
            placeholder="101"
            required
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseRoomModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createRoomMutation.isPending || !roomForm.roomNumber}
            >
              {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
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
            {unitToDelete && unitToDelete.rooms.length > 0 && (
              <span className="block mt-2 text-red-600">
                This will also delete {unitToDelete.rooms.length} room(s).
              </span>
            )}
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

      {/* Delete Room Confirmation */}
      <Modal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        title="Delete Room"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete room <strong>{roomToDelete?.roomNumber}</strong> from{' '}
            <strong>{roomToDelete?.unit.name}</strong>?
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setRoomToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => roomToDelete && deleteRoomMutation.mutate(roomToDelete.id)}
              className="flex-1"
              disabled={deleteRoomMutation.isPending}
            >
              {deleteRoomMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
