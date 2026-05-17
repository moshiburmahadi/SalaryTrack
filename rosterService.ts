export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  createdAt: number;
  warning?: string;
  warningSeen?: boolean;
  warningTimestamp?: number | null;
  isBanned?: boolean;
  rank?: 'Agent' | 'QA' | 'TL';
  photoURL?: string;
  verified?: boolean;
}

export interface SalarySettings {
  userId: string;
  amount: number;
  updatedAt: number;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM (Billing month, e.g., April covers Mar 15 - Apr 14)
  status: 'present' | 'ot' | 'off-day';
}

export interface KPIRecord {
  id?: string;
  userId: string;
  month: string; // YYYY-MM
  shift: 'morning' | 'evening' | 'night';
  grade: 'A' | 'B' | 'C';
}

export interface AccuracyRecord {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  cases: number;
  errors: number;
}

export interface VerificationRequest {
  id?: string;
  userId: string;
  username: string;
  name: string;
  mobile: string;
  address: string;
  rank: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface PremiumRequest {
  id?: string;
  userId: string;
  username: string;
  name: string;
  mobile: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export type View = 'dashboard' | 'salary' | 'attendance' | 'accuracy' | 'kpi' | 'history' | 'admin' | 'kpi_amount_set' | 'user_management' | 'roster' | 'admin_roster' | 'verification_requests';
