import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, Shield, Building, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AddAdminModal } from '../../components/admin/AddAdminModal';
import { apiClient } from '../../api/client';
import { adminsApi } from '../../api/admins';
import type { Admin, Unit } from '../../types';
import { extractErrorMessage } from '../../utils/errors';

export function AdminUsersPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const queryClient = useQueryClient();

  const { data: admins, isLoading: adminsLoading } = useQuery<Admin[]>({
    queryKey: ['admins'],
    queryFn: adminsApi.getAll,
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await apiClient.get('/units');
      return response.data;
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: adminsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setAdminToDelete(null);
      toast.success('Admin deleted successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingAdmin(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['admins'] });
    handleCloseModal();
    toast.success(editingAdmin ? 'Admin updated successfully' : 'Admin created successfully');
  };

  const getRoleBadge = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3 mr-1" />
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Building className="w-3 h-3 mr-1" />
        Property Manager
      </span>
    );
  };

  if (adminsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-20 sm:pb-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-gray-600 mt-1">Manage admin users and permissions</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Add Admin
        </Button>
      </div>

      <div className="grid gap-4">
        {admins?.map((admin) => (
          <Card key={admin.id}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-gray-900">{admin.name}</h3>
                    {getRoleBadge(admin.role)}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{admin.email}</span>
                    </div>

                    {admin.role === 'PROPERTY_MANAGER' &&
                      admin.unitAssignments &&
                      admin.unitAssignments.length > 0 && (
                        <div className="flex items-start gap-2 mt-2">
                          <Building className="w-4 h-4 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">
                              Assigned Units ({admin.unitAssignments.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {admin.unitAssignments.map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {assignment.unit.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEditAdmin(admin)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit admin"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAdminToDelete(admin)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}

        {admins?.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No admin users yet</p>
                <p className="text-sm mt-1">Click "Add Admin" to create one</p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <AddAdminModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        editingAdmin={editingAdmin}
        units={units || []}
      />

      <Modal
        isOpen={!!adminToDelete}
        onClose={() => setAdminToDelete(null)}
        title="Delete Admin"
        trackingId="delete-admin"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{adminToDelete?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setAdminToDelete(null)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                adminToDelete && deleteAdminMutation.mutate(adminToDelete.id)
              }
              disabled={deleteAdminMutation.isPending}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleteAdminMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
