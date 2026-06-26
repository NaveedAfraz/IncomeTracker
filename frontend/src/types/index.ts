export type ProjectStatus = 'Completed' | 'Pending' | 'High Pending' | 'Ongoing' | 'Failed';
export type ProjectType = 'Freelance' | 'Internship' | 'College';
export type TransactionType = 'Paid' | 'Due';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  projectId: string;
  amount: number;
  type: TransactionType;
  date: string;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  type: ProjectType;
  period: string;
  startDate?: string | null;
  endDate?: string | null;
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  status: ProjectStatus;
  notes: string;
  transactions: Transaction[];
  created_at?: string;
}

export interface DashboardStats {
  totalWorkValue: number;
  totalReceived: number;
  totalPending: number;
  totalFailed: number;
  numberOfProjects: number;
}
