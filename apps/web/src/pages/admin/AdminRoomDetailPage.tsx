import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Trash2, UserPlus, UserMinus, Pencil, Plus, Mail, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { apiClient } from '../../api/client';
import { tenantsApi } from '../../api/tenants';
import { extractErrorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';

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
    occupants?: Array<{
      id: string;
      name: string;
    }>;
  } | null;
}

interface UnassignedTenant {
  id: string;
  email: string;
  startDate: string;
  occupants: Array<{
    id: string;
    name: string;
  }>;
}

interface Occupant {
  id: string;
  name: string;
  choreDay: number;
  isActive: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AdminRoomDetailPage() {
  const { roomId, unitId } = useParams<{ roomId: string; unitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [roomNumber, setRoomNumber] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRemoveTenantModal, setShowRemoveTenantModal] = useState(false);
  const [showOccupantModal, setShowOccupantModal] = useState(false);
  const [editingOccupant, setEditingOccupant] = useState<Occupant | null>(null);
  const [occupantForm, setOccupantForm] = useState({ name: '', choreDay: 0 });
  const [occupantToDelete, setOccupantToDelete] = useState<Occupant | null>(null);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [tenantEmail, setTenantEmail] = useState('');
  const [showCreateTenantForm, setShowCreateTenantForm] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({
    email: '',
    phone: '',
    primaryOccupantName: '',
    choreDay: 0,
    startDate: new Date().toISOString().split('T')[0],
  });

  const { data: room, isLoading } = useQuery<Room>({
    queryKey: ['room', roomId],
    queryFn: async () => {
      const response = await apiClient.get(`/rooms/${roomId}`);
      setRoomNumber(response.data.roomNumber);
      return response.data;
    },
    enabled: !!roomId,
  });

  const { data: unassignedTenants } = useQuery<UnassignedTenant[]>({
    queryKey: ['unassigned-tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants/unassigned');
      return response.data;
    },
    enabled: showAssignModal,
  });

  const { data: occupants } = useQuery<Occupant[]>({
    queryKey: ['occupants', room?.tenant?.id],
    queryFn: async () => {
      if (!room?.tenant?.id) return [];
      const response = await apiClient.get(`/occupants/admin/tenant/${room.tenant.id}`);
      return response.data;
    },
    enabled: !!room?.tenant?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { roomNumber: string }) => {
      await apiClient.patch(`/rooms/${roomId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      toast.success('Room updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit', unitId] });
      toast.success('Room deleted successfully');
      navigate(unitId ? `/admin/units/${unitId}` : '/admin/units');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const assignTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.patch(`/tenants/${tenantId}`, { roomId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tenants'] });
      setShowAssignModal(false);
      toast.success('Tenant assigned successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const removeTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.patch(`/tenants/${tenantId}`, { roomId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tenants'] });
      setShowRemoveTenantModal(false);
      toast.success('Tenant removed successfully');
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

  const createOccupantMutation = useMutation({
    mutationFn: async (data: typeof occupantForm) => {
      if (!room?.tenant?.id) throw new Error('No tenant assigned');
      await apiClient.post(`/occupants/admin/tenant/${room.tenant.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupants', room?.tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      setShowOccupantModal(false);
      setOccupantForm({ name: '', choreDay: 0 });
      toast.success('Occupant created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateOccupantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof occupantForm }) => {
      await apiClient.patch(`/occupants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupants', room?.tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      setShowOccupantModal(false);
      setEditingOccupant(null);
      setOccupantForm({ name: '', choreDay: 0 });
      toast.success('Occupant updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const deleteOccupantMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/occupants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupants', room?.tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      setOccupantToDelete(null);
      toast.success('Occupant deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) => {
      await apiClient.patch(`/tenants/${id}`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setShowEditTenantModal(false);
      toast.success('Tenant email updated successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: typeof newTenantForm & { roomId: string }) => {
      // Convert date string to ISO 8601 datetime
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
      };
      await apiClient.post('/tenants', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-tenants'] });
      setShowAssignModal(false);
      setShowCreateTenantForm(false);
      setNewTenantForm({
        email: '',
        phone: '',
        primaryOccupantName: '',
        choreDay: 0,
        startDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Tenant created and assigned successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleSave = () => {
    if (roomNumber && roomNumber !== room?.roomNumber) {
      updateMutation.mutate({ roomNumber });
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleOpenOccupantModal = (occupant?: Occupant) => {
    if (occupant) {
      setEditingOccupant(occupant);
      setOccupantForm({ name: occupant.name, choreDay: occupant.choreDay });
    } else {
      setEditingOccupant(null);
      setOccupantForm({ name: '', choreDay: 0 });
    }
    setShowOccupantModal(true);
  };

  const handleSubmitOccupant = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOccupant) {
      updateOccupantMutation.mutate({ id: editingOccupant.id, data: occupantForm });
    } else {
      createOccupantMutation.mutate(occupantForm);
    }
  };

  const handleOpenEditTenantModal = () => {
    if (room?.tenant) {
      setTenantEmail(room.tenant.email);
      setShowEditTenantModal(true);
    }
  };

  const handleSubmitTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (room?.tenant?.id && tenantEmail !== room.tenant.email) {
      updateTenantMutation.mutate({ id: room.tenant.id, email: tenantEmail });
    }
  };

  const handleSubmitNewTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId) {
      createTenantMutation.mutate({ ...newTenantForm, roomId });
    }
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setShowCreateTenantForm(false);
    setNewTenantForm({
      email: '',
      phone: '',
      primaryOccupantName: '',
      choreDay: 0,
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Room not found</p>
        <Button onClick={() => navigate(unitId ? `/admin/units/${unitId}` : '/admin/units')} className="mt-4">
          Back to Unit
        </Button>
      </div>
    );
  }

  const hasChanges = roomNumber !== room.roomNumber;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(unitId ? `/admin/units/${unitId}` : '/admin/units')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Room {room.roomNumber}</h1>
            <p className="text-gray-600">{room.unit.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !roomNumber}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          {!room.tenant && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Room
            </Button>
          )}
        </div>
      </div>

      {/* Room Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Room Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Room Number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="101"
          />
        </CardBody>
      </Card>

      {/* Tenant Information */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tenant Information</h2>
          {room.tenant ? (
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => impersonateMutation.mutate(room.tenant!.id)}
                  disabled={impersonateMutation.isPending}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {impersonateMutation.isPending ? 'Loading...' : 'Impersonate'}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => sendLoginLinkMutation.mutate(room.tenant!.id)}
                disabled={sendLoginLinkMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendLoginLinkMutation.isPending ? 'Sending...' : 'Resend Login Email'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRemoveTenantModal(true)}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Remove Tenant
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowAssignModal(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Tenant
            </Button>
          )}
        </CardHeader>
        <CardBody>
          {room.tenant ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <button
                    onClick={handleOpenEditTenantModal}
                    className="p-1 text-gray-400 hover:text-primary-600 rounded transition-colors"
                    title="Edit email"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-gray-900">{room.tenant.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="text-gray-900">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      room.tenant.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {room.tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No tenant assigned to this room</p>
          )}
        </CardBody>
      </Card>

      {/* Occupants Section - Only show if tenant is assigned */}
      {room.tenant && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Occupants</h2>
            <Button
              size="sm"
              onClick={() => handleOpenOccupantModal()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Occupant
            </Button>
          </CardHeader>
          <CardBody>
            {occupants && occupants.length > 0 ? (
              <div className="space-y-2">
                {occupants
                  .filter((occ) => occ.isActive)
                  .map((occupant) => (
                    <div
                      key={occupant.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{occupant.name}</div>
                        <div className="text-sm text-gray-600">
                          Chore Day: {DAYS[occupant.choreDay]}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenOccupantModal(occupant)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit occupant"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setOccupantToDelete(occupant)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove occupant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No occupants yet. Add an occupant to get started.</p>
            )}
          </CardBody>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Room"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete room <strong>{room.roomNumber}</strong> from{' '}
            <strong>{room.unit.name}</strong>?
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex-1"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Tenant Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={handleCloseAssignModal}
        title={showCreateTenantForm ? 'Create New Tenant' : 'Assign Tenant to Room'}
      >
        <div className="space-y-4">
          {!showCreateTenantForm ? (
            <>
              {unassignedTenants && unassignedTenants.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    Select a tenant to assign to room {room.roomNumber}:
                  </p>
                  <div className="space-y-2">
                    {unassignedTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => assignTenantMutation.mutate(tenant.id)}
                        disabled={assignTenantMutation.isPending}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50"
                      >
                        <div className="font-medium text-gray-900">{tenant.email}</div>
                        {tenant.occupants.length > 0 && (
                          <div className="text-sm text-gray-600">
                            {tenant.occupants.map((o) => o.name).join(', ')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-4">No unassigned tenants available</p>
                  <Button onClick={() => setShowCreateTenantForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Tenant
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  onClick={handleCloseAssignModal}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmitNewTenant} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={newTenantForm.email}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, email: e.target.value })}
                placeholder="tenant@example.com"
                required
              />

              <Input
                label="Phone (Optional)"
                type="tel"
                value={newTenantForm.phone}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, phone: e.target.value })}
                placeholder="+1234567890"
              />

              <Input
                label="Primary Occupant Name"
                value={newTenantForm.primaryOccupantName}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, primaryOccupantName: e.target.value })}
                placeholder="John Doe"
                required
              />

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Occupant Chore Day
                </label>
                <select
                  value={newTenantForm.choreDay}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, choreDay: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                  required
                >
                  {DAYS.map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Start Date"
                type="date"
                value={newTenantForm.startDate}
                onChange={(e) => setNewTenantForm({ ...newTenantForm, startDate: e.target.value })}
                required
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateTenantForm(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createTenantMutation.isPending || !newTenantForm.email || !newTenantForm.primaryOccupantName}
                >
                  {createTenantMutation.isPending ? 'Creating...' : 'Create Tenant'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Remove Tenant Confirmation Modal */}
      <Modal
        isOpen={showRemoveTenantModal}
        onClose={() => setShowRemoveTenantModal(false)}
        title="Remove Tenant"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to remove <strong>{room.tenant?.email}</strong> from this room?
            The tenant will remain in the system but will be unassigned from any room.
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRemoveTenantModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => room.tenant && removeTenantMutation.mutate(room.tenant.id)}
              className="flex-1"
              disabled={removeTenantMutation.isPending}
            >
              {removeTenantMutation.isPending ? 'Removing...' : 'Remove Tenant'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Tenant Email Modal */}
      <Modal
        isOpen={showEditTenantModal}
        onClose={() => {
          setShowEditTenantModal(false);
          setTenantEmail('');
        }}
        title="Edit Tenant Email"
      >
        <form onSubmit={handleSubmitTenant} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={tenantEmail}
            onChange={(e) => setTenantEmail(e.target.value)}
            placeholder="tenant@example.com"
            required
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowEditTenantModal(false);
                setTenantEmail('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={updateTenantMutation.isPending || !tenantEmail || tenantEmail === room.tenant?.email}
            >
              {updateTenantMutation.isPending ? 'Updating...' : 'Update Email'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Occupant Modal */}
      <Modal
        isOpen={showOccupantModal}
        onClose={() => {
          setShowOccupantModal(false);
          setEditingOccupant(null);
          setOccupantForm({ name: '', choreDay: 0 });
        }}
        title={editingOccupant ? 'Edit Occupant' : 'Add Occupant'}
      >
        <form onSubmit={handleSubmitOccupant} className="space-y-4">
          <Input
            label="Name"
            value={occupantForm.name}
            onChange={(e) => setOccupantForm({ ...occupantForm, name: e.target.value })}
            placeholder="Enter occupant name"
            required
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chore Day
            </label>
            <select
              value={occupantForm.choreDay}
              onChange={(e) => setOccupantForm({ ...occupantForm, choreDay: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
              required
            >
              {DAYS.map((day, index) => (
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
                setShowOccupantModal(false);
                setEditingOccupant(null);
                setOccupantForm({ name: '', choreDay: 0 });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={(createOccupantMutation.isPending || updateOccupantMutation.isPending) || !occupantForm.name}
            >
              {createOccupantMutation.isPending || updateOccupantMutation.isPending
                ? (editingOccupant ? 'Updating...' : 'Adding...')
                : (editingOccupant ? 'Update Occupant' : 'Add Occupant')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Occupant Confirmation Modal */}
      <Modal
        isOpen={!!occupantToDelete}
        onClose={() => setOccupantToDelete(null)}
        title="Remove Occupant"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to remove <strong>{occupantToDelete?.name}</strong>?
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setOccupantToDelete(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => occupantToDelete && deleteOccupantMutation.mutate(occupantToDelete.id)}
              className="flex-1"
              disabled={deleteOccupantMutation.isPending}
            >
              {deleteOccupantMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
