import type { RoomType, RoomStatus, StudentStatus } from '@/types/models';

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Lavish Boys Hostel';
export const CURRENCY = import.meta.env.VITE_DEFAULT_CURRENCY || 'PKR';
export const DATE_FORMAT = import.meta.env.VITE_DEFAULT_DATE_FORMAT || 'DD/MM/YYYY';

export const PAGE_SIZE = 20;

export const EXPENSE_CATEGORIES = [
  'Food',
  'Electricity',
  'Gas',
  'Internet',
  'Repairs',
  'Cleaning',
  'Furniture',
  'Maintenance',
  'Transport',
  'Miscellaneous',
] as const;

export const ROOM_TYPES: { label: string; value: RoomType }[] = [
  { label: 'Single', value: 'single' },
  { label: 'Double', value: 'double' },
  { label: 'Triple', value: 'triple' },
  { label: 'Custom', value: 'custom' },
];

export const DEFAULT_CAPACITY: Record<RoomType, number> = {
  single: 1,
  double: 2,
  triple: 3,
  custom: 1,
};

export const ROOM_STATUS: { label: string; value: RoomStatus; color: string }[] = [
  { label: 'Active', value: 'active', color: 'green' },
  { label: 'Inactive', value: 'inactive', color: 'default' },
  { label: 'Maintenance', value: 'maintenance', color: 'orange' },
];

export const STUDENT_STATUS: { label: string; value: StudentStatus; color: string }[] = [
  { label: 'Active', value: 'active', color: 'green' },
  { label: 'Left', value: 'left', color: 'default' },
  { label: 'Suspended', value: 'suspended', color: 'red' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const STORAGE_BUCKETS = {
  studentDocuments: 'student-documents',
  studentPhotos: 'student-photos',
  receipts: 'receipts',
  expenseBills: 'expense-bills',
  employeeDocuments: 'employee-documents',
  hostelFiles: 'hostel-files',
} as const;
