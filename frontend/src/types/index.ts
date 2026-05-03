export type ProjectStatus = 'Completed' | 'Pending' | 'High Pending' | 'Ongoing';
export type ProjectType = 'Freelance' | 'Internship' | 'College';
export type TransactionType = 'Paid' | 'Due';

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
  numberOfProjects: number;
}
