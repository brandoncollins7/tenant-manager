import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, Phone, Calendar, Trash2, Pencil, Upload, History, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedList, FadeIn } from '../../components/ui/AnimatedList';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { AddTenantModal } from '../../components/admin/AddTenantModal';
import { LeaseHistoryModal } from '../../components/admin/LeaseHistoryModal';
import { UploadLeaseModal } from '../../components/admin/UploadLeaseModal';
import { apiClient } from '../../api/client';
import { tenantsApi } from '../../api/tenants';
import { DAYS_OF_WEEK } from '../../types';
import { extractErrorMessage } from '../../utils/errors';

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
  occupants: {
    id: string;
    name: string;
    choreDay: number;
    isActive: boolean;
  }[];
}

export function AdminTenantsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants');
      return response.data;
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.delete(`/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-lg" />
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
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
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600">Manage tenant accounts and occupants</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Tenant List */}
      {tenants?.length === 0 ? (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-gray-600">No tenants yet. Add your first tenant to get started.</p>
          </CardBody>
        </Card>
      ) : (
        <AnimatedList className="space-y-4">
          {tenants?.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Room {tenant.room?.roomNumber ?? 'N/A'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={() => setTenantToDelete(tenant)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete tenant"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {tenant.email}
                  </span>
                  {tenant.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {tenant.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Since {new Date(tenant.startDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Lease Management */}
                <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => sendLoginLinkMutation.mutate(tenant.id)}
                    disabled={sendLoginLinkMutation.isPending}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50"
                    title="Send login link email"
                  >
                    <Mail className="w-4 h-4" />
                    Resend Login Email
                  </button>

                  <span className="text-gray-300">|</span>

                  <button
                    onClick={() =>
                      setUploadLeaseModal({
                        isOpen: true,
                        tenantId: tenant.id,
                        tenantName: tenant.email,
                      })
                    }
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    title="Upload new lease version"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Lease
                  </button>

                  {tenant.leaseDocument && (
                    <>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() =>
                          setHistoryModal({
                            isOpen: true,
                            tenantId: tenant.id,
                            tenantName: tenant.email,
                          })
                        }
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        title="View lease history"
                      >
                        <History className="w-4 h-4" />
                        History
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await tenantsApi.getCurrentLeaseBlob(tenant.id);
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          } catch (error) {
                            toast.error(extractErrorMessage(error));
                          }
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        title="View current lease"
                      >
                        <FileText className="w-4 h-4" />
                        View Current
                      </button>
                    </>
                  )}
                </div>

                {/* Occupants */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Occupants ({tenant.occupants?.length ?? 0})
                  </h4>
                  {tenant.occupants?.length > 0 ? (
                    <div className="grid gap-2">
                      {tenant.occupants.map((occupant) => (
                        <div
                          key={occupant.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">
                              {occupant.name}
                            </span>
                            <span className="text-sm text-gray-600 ml-3">
                              {DAYS_OF_WEEK[occupant.choreDay]}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditOccupant(occupant)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit occupant"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setOccupantToDelete(occupant)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete occupant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No occupants added</p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </AnimatedList>
      )}

      <AddTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {uploadLeaseModal && (
        <UploadLeaseModal
          isOpen={uploadLeaseModal.isOpen}
          onClose={() => setUploadLeaseModal(null)}
          tenantId={uploadLeaseModal.tenantId}
          tenantName={uploadLeaseModal.tenantName}
        />
      )}

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
    </div>
    </FadeIn>
  );
}
