import { User } from '../models/User';

export interface HiringViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export interface JobPosting {
  id: number;
  jobTitle: string;
  description: string;
  deadlineDate: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: number;
  jobPostingId: number;
  userEmail: string;
  resumeFileName: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  interviewDate: string | null;
  interviewTime: string | null;
  interviewDescription: string | null;
  rejectionNote: string | null;
  appliedAt: string;
  jobTitle: string;
  applicantFirstName: string | null;
  applicantLastName: string | null;
  applicantEmail: string;
}
