import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  DoorOpen,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { TenantInfoCard } from '../../components/admin/TenantInfoCard';
import { LeaseHistoryModal } from '../../components/admin/LeaseHistoryModal';
import { UploadLeaseModal } from '../../components/admin/UploadLeaseModal';
import { apiClient } from '../../api/client';
import { tenantsApi } from '../../api/tenants';
import { DAYS_OF_WEEK } from '../../types';
import { extractErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';

type TabType = 'tenants' | 'rooms';

interface Occupant {
  id: string;
  name: string;
  choreDay: number;
  isActive: boolean;
}

interface Tenant {
  id: string;
  email: string;
  phone?: string;
  startDate: string;
  isActive: boolean;
  leaseDocument?: string;
  room: {
    id: string;
    roomNumber: string;
  };
  occupants: Occupant[];
}

interface Room {
  id: string;
  roomNumber: string;
  unitId: string;
  tenant?: {
    id: string;
    email: string;
    isActive: boolean;
  } | null;
}

interface Unit {
  id: string;
  name: string;
  timezone: string;
  rooms: Room[];
  _count: {
    rooms: number;
    tenants?: number;
  };
}

export function AdminUnitDetailPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<TabType>('tenants');

  // Tenant-related state
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [occupantToEdit, setOccupantToEdit] = useState<Occupant | null>(null);
  const [occupantToDelete, setOccupantToDelete] = useState<Occupant | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedChoreDay, setEditedChoreDay] = useState<number>(0);
  const [uploadLeaseModal, setUploadLeaseModal] = useState<{
    isOpen: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [editTenantModal, setEditTenantModal] = useState<{
    tenantId: string;
    currentData: { email: string; phone?: string; startDate: string };
  } | null>(null);
  const [editTenantForm, setEditTenantForm] = useState({
    email: '',
    phone: '',
    startDate: '',
  });
  const [addOccupantModal, setAddOccupantModal] = useState<{
    tenantId: string;
  } | null>(null);
  const [newOccupantName, setNewOccupantName] = useState('');
  const [newOccupantChoreDay, setNewOccupantChoreDay] = useState(0);

  // Room-related state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({ roomNumber: '' });
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Add tenant form state
  const [tenantForm, setTenantForm] = useState({
    email: '',
    phone: '',
    roomId: '',
    startDate: new Date().toISOString().split('T')[0],
    primaryOccupantName: '',
    choreDay: 1,
  });
  const [tenantFormErrors, setTenantFormErrors] = useState<Record<string, string>>({});

  // Fetch unit details
  const { data: unit, isLoading: unitLoading } = useQuery<Unit>({
    queryKey: ['unit', unitId],
    queryFn: async () => {
      const response = await apiClient.get(`/units/${unitId}`);
      return response.data;
    },
    enabled: !!unitId,
  });

  // Fetch tenants for this unit
  const { data: tenants, isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ['unit', unitId, 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get(`/tenants?unitId=${unitId}`);
      return response.data;
    },
    enabled: !!unitId,
  });

  // Fetch available rooms for this unit (rooms without tenants)
  const { data: availableRooms } = useQuery<Room[]>({
    queryKey: ['unit', unitId, 'available-rooms'],
    queryFn: async () => {
      const response = await apiClient.get(`/tenants/rooms/available?unitId=${unitId}`);
      return response.data;
    },
    enabled: !!unitId && isAddTenantModalOpen,
  });

  // Mutations
  const createTenantMutation = useMutation({
    mutationFn: async (data: typeof tenantForm) => {
      const response = await apiClient.post('/tenants', {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'available-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      handleCloseAddTenantModal();
      toast.success('Tenant created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.delete(`/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'available-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      setTenantToDelete(null);
      toast.success('Tenant deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateOccupantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; choreDay: number } }) => {
      await apiClient.patch(`/occupants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'tenants'] });
      setOccupantToEdit(null);
      toast.success('Occupant updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteOccupantMutation = useMutation({
    mutationFn: async (occupantId: string) => {
      await apiClient.delete(`/occupants/${occupantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'tenants'] });
      setOccupantToDelete(null);
      toast.success('Occupant deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const sendLoginLinkMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return tenantsApi.sendLoginLink(tenantId);
    },
    onSuccess: () => {
      toast.success('Login link sent successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return tenantsApi.impersonate(tenantId);
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('Opening tenant session in new tab');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { email: string; phone: string; startDate: string } }) => {
      await apiClient.patch(`/tenants/${id}`, {
        email: data.email,
        phone: data.phone || null,
        startDate: new Date(data.startDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'tenants'] });
      setEditTenantModal(null);
      setEditTenantForm({ email: '', phone: '', startDate: '' });
      toast.success('Tenant updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createOccupantMutation = useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: string; data: { name: string; choreDay: number } }) => {
      await apiClient.post(`/occupants/admin/tenant/${tenantId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'tenants'] });
      setAddOccupantModal(null);
      setNewOccupantName('');
      setNewOccupantChoreDay(0);
      toast.success('Occupant added successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: { unitId: string; roomNumber: string }) => {
      await apiClient.post('/rooms', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'available-rooms'] });
      setIsRoomModalOpen(false);
      setRoomForm({ roomNumber: '' });
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
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId, 'available-rooms'] });
      setRoomToDelete(null);
      toast.success('Room deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  // Handlers
  const handleEditOccupant = (occupant: Occupant) => {
    setOccupantToEdit(occupant);
    setEditedName(occupant.name);
    setEditedChoreDay(occupant.choreDay);
  };

  const handleSaveOccupant = () => {
    if (occupantToEdit) {
      updateOccupantMutation.mutate({
        id: occupantToEdit.id,
        data: { name: editedName, choreDay: editedChoreDay },
      });
    }
  };

  const handleCloseAddTenantModal = () => {
    setIsAddTenantModalOpen(false);
    setTenantForm({
      email: '',
      phone: '',
      roomId: '',
      startDate: new Date().toISOString().split('T')[0],
      primaryOccupantName: '',
      choreDay: 1,
    });
    setTenantFormErrors({});
  };

  const validateTenantForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!tenantForm.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantForm.email)) {
      errors.email = 'Invalid email address';
    }

    if (!tenantForm.roomId) {
      errors.roomId = 'Room is required';
    }

    if (!tenantForm.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!tenantForm.primaryOccupantName) {
      errors.primaryOccupantName = 'Primary occupant name is required';
    }

    setTenantFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateTenantForm()) {
      createTenantMutation.mutate(tenantForm);
    }
  };

  const handleSubmitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (unitId) {
      createRoomMutation.mutate({ unitId, roomNumber: roomForm.roomNumber });
    }
  };

  if (unitLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unit not found</p>
        <Button onClick={() => navigate('/admin/units')} className="mt-4">
          Back to Units
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/units')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{unit.name}</h1>
          <p className="text-gray-600">{unit.timezone}</p>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="bg-gray-100 p-1 rounded-lg inline-flex">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'tenants'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Tenants
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'rooms'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          Rooms ({unit.rooms.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Add Tenant Button */}
          <div className="flex justify-end">
            <Button onClick={() => setIsAddTenantModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
          </div>

          {/* Tenants List */}
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : tenants?.length === 0 ? (
            <Card>
              <CardBody className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No tenants yet. Add your first tenant to get started.</p>
              </CardBody>
            </Card>
          ) : (
            tenants?.map((tenant) => (
              <TenantInfoCard
                key={tenant.id}
                tenant={{
                  id: tenant.id,
                  email: tenant.email,
                  phone: tenant.phone,
                  startDate: tenant.startDate,
                  isActive: tenant.isActive,
                  leaseDocument: tenant.leaseDocument,
                }}
                occupants={tenant.occupants || []}
                roomNumber={tenant.room?.roomNumber}
                isSuperAdmin={isSuperAdmin}
                isPendingImpersonate={impersonateMutation.isPending}
                isPendingResendEmail={sendLoginLinkMutation.isPending}
                onImpersonate={() => impersonateMutation.mutate(tenant.id)}
                onResendLoginEmail={() => sendLoginLinkMutation.mutate(tenant.id)}
                onDeleteTenant={() => setTenantToDelete(tenant)}
                onEditTenant={() => {
                  setEditTenantModal({
                    tenantId: tenant.id,
                    currentData: {
                      email: tenant.email,
                      phone: tenant.phone,
                      startDate: tenant.startDate,
                    },
                  });
                  setEditTenantForm({
                    email: tenant.email,
                    phone: tenant.phone || '',
                    startDate: tenant.startDate ? new Date(tenant.startDate).toISOString().split('T')[0] : '',
                  });
                }}
                onUploadLease={() =>
                  setUploadLeaseModal({
                    isOpen: true,
                    tenantId: tenant.id,
                    tenantName: tenant.email,
                  })
                }
                onViewLeaseHistory={() =>
                  setHistoryModal({
                    isOpen: true,
                    tenantId: tenant.id,
                    tenantName: tenant.email,
                  })
                }
                onViewCurrentLease={async () => {
                  try {
                    const blob = await tenantsApi.getCurrentLeaseBlob(tenant.id);
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  } catch (error) {
                    toast.error(extractErrorMessage(error));
                  }
                }}
                onAddOccupant={() => setAddOccupantModal({ tenantId: tenant.id })}
                onEditOccupant={(occupant) => handleEditOccupant(occupant)}
                onDeleteOccupant={(occupant) => setOccupantToDelete(occupant)}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="space-y-4">
          {/* Add Room Button */}
          <div className="flex justify-end">
            <Button onClick={() => setIsRoomModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </div>

          {/* Rooms Grid */}
          {unit.rooms.length === 0 ? (
            <Card>
              <CardBody className="text-center py-8">
                <DoorOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No rooms yet. Add your first room to get started.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unit.rooms.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/admin/units/${unitId}/rooms/${room.id}`)}
                >
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-lg">
                          <DoorOpen className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Room {room.roomNumber}</h3>
                          {room.tenant ? (
                            <p className="text-sm text-gray-500">{room.tenant.email}</p>
                          ) : (
                            <p className="text-sm text-amber-600">Vacant</p>
                          )}
                        </div>
                      </div>
                      {!room.tenant && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToDelete(room);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Tenant Modal */}
      <Modal
        isOpen={isAddTenantModalOpen}
        onClose={handleCloseAddTenantModal}
        title="Add New Tenant"
      >
        <form onSubmit={handleSubmitTenant} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={tenantForm.email}
            onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
            error={tenantFormErrors.email}
            placeholder="tenant@example.com"
          />

          <Input
            label="Phone (optional)"
            type="tel"
            value={tenantForm.phone}
            onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room
            </label>
            <select
              value={tenantForm.roomId}
              onChange={(e) => setTenantForm({ ...tenantForm, roomId: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base ${
                tenantFormErrors.roomId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a room...</option>
              {availableRooms?.map((room) => (
                <option key={room.id} value={room.id}>
                  Room {room.roomNumber}
                </option>
              ))}
            </select>
            {tenantFormErrors.roomId && (
              <p className="mt-1 text-sm text-red-600">{tenantFormErrors.roomId}</p>
            )}
            {availableRooms?.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">No available rooms in this unit</p>
            )}
          </div>

          <Input
            label="Start Date"
            type="date"
            value={tenantForm.startDate}
            onChange={(e) => setTenantForm({ ...tenantForm, startDate: e.target.value })}
            error={tenantFormErrors.startDate}
          />

          <Input
            label="Primary Occupant Name"
            value={tenantForm.primaryOccupantName}
            onChange={(e) => setTenantForm({ ...tenantForm, primaryOccupantName: e.target.value })}
            error={tenantFormErrors.primaryOccupantName}
            placeholder="John Doe"
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chore Day
            </label>
            <select
              value={tenantForm.choreDay}
              onChange={(e) => setTenantForm({ ...tenantForm, choreDay: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseAddTenantModal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createTenantMutation.isPending}
            >
              {createTenantMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Lease Modal */}
      {uploadLeaseModal && (
        <UploadLeaseModal
          isOpen={uploadLeaseModal.isOpen}
          onClose={() => setUploadLeaseModal(null)}
          tenantId={uploadLeaseModal.tenantId}
          tenantName={uploadLeaseModal.tenantName}
        />
      )}

      {/* Lease History Modal */}
      {historyModal && (
        <LeaseHistoryModal
          isOpen={historyModal.isOpen}
          onClose={() => setHistoryModal(null)}
          tenantId={historyModal.tenantId}
          tenantName={historyModal.tenantName}
        />
      )}

      {/* Delete Tenant Confirmation Modal */}
      <Modal
        isOpen={!!tenantToDelete}
        onClose={() => setTenantToDelete(null)}
        title="Delete Tenant"
      >
        <div className="space-y-6">
          <p className="text-gray-700 text-base">
            Are you sure you want to delete the tenant in{' '}
            <span className="font-semibold">
              Room {tenantToDelete?.room?.roomNumber ?? 'N/A'}
            </span>
            ? This will deactivate their account.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setTenantToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => tenantToDelete && deleteTenantMutation.mutate(tenantToDelete.id)}
              isLoading={deleteTenantMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Occupant Modal */}
      <Modal
        isOpen={!!occupantToEdit}
        onClose={() => setOccupantToEdit(null)}
        title="Edit Occupant"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chore Day
            </label>
            <select
              value={editedChoreDay}
              onChange={(e) => setEditedChoreDay(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setOccupantToEdit(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOccupant}
              isLoading={updateOccupantMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Occupant Confirmation Modal */}
      <Modal
        isOpen={!!occupantToDelete}
        onClose={() => setOccupantToDelete(null)}
        title="Delete Occupant"
      >
        <div className="space-y-6">
          <p className="text-gray-700 text-base">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{occupantToDelete?.name}</span>
            ? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setOccupantToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => occupantToDelete && deleteOccupantMutation.mutate(occupantToDelete.id)}
              isLoading={deleteOccupantMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={!!editTenantModal}
        onClose={() => {
          setEditTenantModal(null);
          setEditTenantForm({ email: '', phone: '', startDate: '' });
        }}
        title="Edit Tenant"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editTenantModal) {
              updateTenantMutation.mutate({ id: editTenantModal.tenantId, data: editTenantForm });
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Email"
            type="email"
            value={editTenantForm.email}
            onChange={(e) => setEditTenantForm({ ...editTenantForm, email: e.target.value })}
            placeholder="tenant@example.com"
            required
          />

          <Input
            label="Phone (Optional)"
            type="tel"
            value={editTenantForm.phone}
            onChange={(e) => setEditTenantForm({ ...editTenantForm, phone: e.target.value })}
            placeholder="+1234567890"
          />

          <Input
            label="Start Date"
            type="date"
            value={editTenantForm.startDate}
            onChange={(e) => setEditTenantForm({ ...editTenantForm, startDate: e.target.value })}
            required
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditTenantModal(null);
                setEditTenantForm({ email: '', phone: '', startDate: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={updateTenantMutation.isPending || !editTenantForm.email || !editTenantForm.startDate}
            >
              {updateTenantMutation.isPending ? 'Updating...' : 'Update Tenant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Occupant Modal */}
      <Modal
        isOpen={!!addOccupantModal}
        onClose={() => {
          setAddOccupantModal(null);
          setNewOccupantName('');
          setNewOccupantChoreDay(0);
        }}
        title="Add Occupant"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (addOccupantModal && newOccupantName) {
              createOccupantMutation.mutate({
                tenantId: addOccupantModal.tenantId,
                data: { name: newOccupantName, choreDay: newOccupantChoreDay },
              });
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={newOccupantName}
            onChange={(e) => setNewOccupantName(e.target.value)}
            placeholder="Enter occupant name"
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chore Day
            </label>
            <select
              value={newOccupantChoreDay}
              onChange={(e) => setNewOccupantChoreDay(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
              required
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAddOccupantModal(null);
                setNewOccupantName('');
                setNewOccupantChoreDay(0);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createOccupantMutation.isPending || !newOccupantName}
            >
              {createOccupantMutation.isPending ? 'Adding...' : 'Add Occupant'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Room Modal */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setRoomForm({ roomNumber: '' });
        }}
        title="Add New Room"
      >
        <form onSubmit={handleSubmitRoom} className="space-y-4">
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
              onClick={() => {
                setIsRoomModalOpen(false);
                setRoomForm({ roomNumber: '' });
              }}
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

      {/* Delete Room Confirmation */}
      <Modal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        title="Delete Room"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete room <strong>{roomToDelete?.roomNumber}</strong>?
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
