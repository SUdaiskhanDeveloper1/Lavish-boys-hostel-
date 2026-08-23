// Domain enums & model types shared across the app.

export type RoomStatus = 'active' | 'inactive' | 'maintenance';
export type RoomType = 'single' | 'double' | 'triple' | 'custom';
export type StudentStatus = 'active' | 'left' | 'suspended';
export type PaymentMethod = 'cash' | 'online' | 'mixed';
export type EmployeeStatus = 'active' | 'inactive' | 'terminated';
export type EmpTxnType = 'salary' | 'bonus' | 'advance' | 'deduction';
export type TimelineType =
  | 'admission'
  | 'room_changed'
  | 'fee_paid'
  | 'warning'
  | 'leaving'
  | 'note';

export interface Room {
  id: string;
  room_number: string;
  floor: number;
  room_type: RoomType;
  capacity: number;
  occupied_seats: number;
  rent_per_month: number;
  status: RoomStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  father_name: string | null;
  cnic: string | null;
  phone: string | null;
  emergency_contact: string | null;
  email: string | null;
  address: string | null;
  blood_group: string | null;
  medical_notes: string | null;
  guardian_details: string | null;
  photo_url: string | null;
  cnic_front_url: string | null;
  cnic_back_url: string | null;
  documents: { name: string; url: string }[];
  room_id: string | null;
  seat_number: string | null;
  joining_date: string;
  leaving_date: string | null;
  monthly_fee: number;
  security_deposit: number;
  admission_fee: number;
  status: StudentStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Joined (optional)
  room?: Pick<Room, 'id' | 'room_number'> | null;
}

export interface FeePayment {
  id: string;
  receipt_no: string;
  student_id: string;
  room_id: string | null;
  seat_number: string | null;
  fee_month: string;
  amount: number;
  cash_amount: number;
  online_amount: number;
  method: PaymentMethod;
  paid_on: string;
  collected_by: string | null;
  notes: string | null;
  pdf_url: string | null;
  drive_file_id: string | null;
  created_at: string;
  student?: Pick<Student, 'id' | 'full_name' | 'phone'> | null;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  spent_on: string;
  paid_to: string | null;
  description: string | null;
  bill_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  full_name: string;
  cnic: string | null;
  phone: string | null;
  designation: string | null;
  photo_url: string | null;
  documents: { name: string; url: string }[];
  joining_date: string;
  salary: number;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayment {
  id: string;
  employee_id: string;
  txn_type: EmpTxnType;
  amount: number;
  for_month: string | null;
  paid_on: string;
  notes: string | null;
  created_at: string;
  employee?: Pick<Employee, 'id' | 'full_name'> | null;
}

export interface HostelSettings {
  id: number;
  hostel_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  receipt_footer: string | null;
  currency: string;
  date_format: string;
  theme: 'light' | 'dark';
  drive_folder_id: string | null;
  drive_connected: boolean;
  updated_at: string;
}

export interface StudentTimelineEvent {
  id: string;
  student_id: string;
  event_type: TimelineType;
  title: string;
  detail: string | null;
  event_date: string;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  device: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface StudentFinancials {
  student_id: string;
  full_name: string;
  status: StudentStatus;
  monthly_fee: number;
  joining_date: string;
  effective_end: string;
  months_stayed: number;
  total_paid: number;
  pending_amount: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}
