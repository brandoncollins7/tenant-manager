import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, Phone, Calendar, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AddTenantModal } from '../../components/admin/AddTenantModal';
import { apiClient } from '../../api/client';
import { DAYS_OF_WEEK } from '../../types';

interface Tenant {
  id: string;
  email: string;
  phone?: string;
  startDate: string;
  isActive: boolean;
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
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants');
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.delete(`/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      setTenantToDelete(null);
    },
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600">Manage tenant accounts and occupants</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      {/* Tenant List */}
      <div className="space-y-4">
        {tenants?.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8">
              <p className="text-gray-600">No tenants yet. Add your first tenant to get started.</p>
            </CardBody>
          </Card>
        ) : (
          tenants?.map((tenant) => (
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

                {/* Occupants */}
                <div>
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
                          <span className="font-medium text-gray-900">
                            {occupant.name}
                          </span>
                          <span className="text-sm text-gray-600">
                            {DAYS_OF_WEEK[occupant.choreDay]}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No occupants added</p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      <AddTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!tenantToDelete}
        onClose={() => setTenantToDelete(null)}
        title="Delete Tenant"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the tenant in{' '}
            <span className="font-semibold">
              Room {tenantToDelete?.room?.roomNumber ?? 'N/A'}
            </span>
            ? This will deactivate their account.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setTenantToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => tenantToDelete && deleteMutation.mutate(tenantToDelete.id)}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
