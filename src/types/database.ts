// Minimal Supabase `Database` type so the client is strongly typed.
// Mirrors supabase/schema.sql. (Can be replaced by `supabase gen types` output.)
import type {
  Room,
  Student,
  FeePayment,
  Expense,
  Employee,
  EmployeePayment,
  HostelSettings,
  StudentTimelineEvent,
  AuditLog,
  AppNotification,
  StudentFinancials,
} from './models';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type View<Row> = { Row: Row; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        role: string;
        created_at: string;
        updated_at: string;
      }>;
      hostel_settings: Table<HostelSettings>;
      rooms: Table<Room>;
      students: Table<Student>;
      fee_payments: Table<FeePayment>;
      expenses: Table<Expense>;
      employees: Table<Employee>;
      employee_payments: Table<EmployeePayment>;
      student_timeline: Table<StudentTimelineEvent>;
      audit_logs: Table<AuditLog>;
      notifications: Table<AppNotification>;
    };
    Views: {
      student_financials: View<StudentFinancials>;
      room_occupancy: View<Room & { vacant_seats: number }>;
      daily_income: View<{ day: string; income: number }>;
      daily_expense: View<{ day: string; expense: number }>;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
