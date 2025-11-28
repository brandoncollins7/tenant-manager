import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { apiClient } from '../../api/client';
import { DAYS_OF_WEEK } from '../../types';

interface Room {
  id: string;
  roomNumber: string;
  unit: {
    id: string;
    name: string;
  };
}

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  email: string;
  phone: string;
  roomId: string;
  startDate: string;
  primaryOccupantName: string;
  choreDay: number;
}

export function AddTenantModal({ isOpen, onClose }: AddTenantModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    phone: '',
    roomId: '',
    startDate: new Date().toISOString().split('T')[0],
    primaryOccupantName: '',
    choreDay: 1,
  });
  const [leaseFile, setLeaseFile] = useState<File | null>(null);
  const [leaseNotes, setLeaseNotes] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const { data: availableRooms, isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ['available-rooms'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants/rooms/available');
      return response.data;
    },
    enabled: isOpen,
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiClient.post('/tenants', {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
      });
      return response.data;
    },
    onSuccess: async (tenant) => {
      if (leaseFile) {
        const formData = new FormData();
        formData.append('file', leaseFile);
        if (leaseNotes) {
          formData.append('notes', leaseNotes);
        }
        await apiClient.post(`/tenants/${tenant.id}/lease`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['available-rooms'] });
      handleClose();
    },
  });

  const handleClose = () => {
    setFormData({
      email: '',
      phone: '',
      roomId: '',
      startDate: new Date().toISOString().split('T')[0],
      primaryOccupantName: '',
      choreDay: 1,
    });
    setLeaseFile(null);
    setLeaseNotes('');
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.roomId) {
      newErrors.roomId = 'Room is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.primaryOccupantName) {
      newErrors.primaryOccupantName = 'Primary occupant name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      createTenantMutation.mutate(formData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setLeaseFile(file);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Tenant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          placeholder="tenant@example.com"
        />

        <Input
          label="Phone (optional)"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room
          </label>
          <select
            value={formData.roomId}
            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base ${
              errors.roomId ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={roomsLoading}
          >
            <option value="">Select a room...</option>
            {availableRooms?.map((room) => (
              <option key={room.id} value={room.id}>
                {room.unit.name} - Room {room.roomNumber}
              </option>
            ))}
          </select>
          {errors.roomId && <p className="mt-1 text-sm text-red-600">{errors.roomId}</p>}
          {availableRooms?.length === 0 && !roomsLoading && (
            <p className="mt-1 text-sm text-amber-600">No available rooms</p>
          )}
        </div>

        <Input
          label="Start Date"
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          error={errors.startDate}
        />

        <Input
          label="Primary Occupant Name"
          value={formData.primaryOccupantName}
          onChange={(e) => setFormData({ ...formData, primaryOccupantName: e.target.value })}
          error={errors.primaryOccupantName}
          placeholder="John Doe"
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chore Day
          </label>
          <select
            value={formData.choreDay}
            onChange={(e) => setFormData({ ...formData, choreDay: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
          >
            {DAYS_OF_WEEK.map((day, index) => (
              <option key={index} value={index}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lease Agreement (optional)
          </label>
          {leaseFile ? (
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                  {leaseFile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLeaseFile(null)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">Click to upload PDF</span>
              <span className="text-xs text-gray-400">Max 10MB</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {leaseFile && (
          <Input
            label="Version Notes (optional)"
            value={leaseNotes}
            onChange={(e) => setLeaseNotes(e.target.value)}
            placeholder="e.g., Initial lease agreement"
          />
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
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

        {createTenantMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            {(createTenantMutation.error as Error)?.message || 'Failed to create tenant'}
          </p>
        )}
      </form>
    </Modal>
  );
}
