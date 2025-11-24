export interface HiringRequest {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  eventId?: string;
  title: string;
  description: string;
  requirements: string[];
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  timeline: {
    startDate: Date;
    endDate: Date;
    isFlexible: boolean;
  };
  location: {
    type: 'remote' | 'on-site' | 'hybrid';
    address?: string;
    city: string;
    state: string;
  };
  status: HiringStatus;
  skillsRequired: string[];
  experienceLevel: ExperienceLevel;
  contractType: ContractType;
  paymentTerms: PaymentTerms;
  createdAt: Date;
  updatedAt: Date;
  proposals: Proposal[];
  selectedProposalId?: string;
}

export enum HiringStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
  ANY = 'any'
}

export enum ContractType {
  FIXED_PRICE = 'fixed_price',
  HOURLY = 'hourly',
  MILESTONE = 'milestone',
  RETAINER = 'retainer'
}

export interface PaymentTerms {
  paymentSchedule: PaymentSchedule[];
  depositRequired: boolean;
  depositPercentage: number;
  latePaymentFee: number;
  refundPolicy: string;
}

export interface PaymentSchedule {
  milestone: string;
  percentage: number;
  dueDate: Date;
  isCompleted: boolean;
}

export interface Proposal {
  id: string;
  providerId: string;
  hiringRequestId: string;
  title: string;
  description: string;
  proposedBudget: number;
  timeline: {
    startDate: Date;
    endDate: Date;
  };
  deliverables: string[];
  terms: string[];
  status: ProposalStatus;
  submittedAt: Date;
  updatedAt: Date;
  clientFeedback?: string;
  revisions: ProposalRevision[];
}

export enum ProposalStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  REVISED = 'revised',
  WITHDRAWN = 'withdrawn'
}

export interface ProposalRevision {
  id: string;
  proposalId: string;
  changes: string;
  reason: string;
  submittedAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface HiringContract {
  id: string;
  hiringRequestId: string;
  proposalId: string;
  clientId: string;
  providerId: string;
  terms: ContractTerms;
  status: ContractStatus;
  startDate: Date;
  endDate: Date;
  totalValue: number;
  milestones: ContractMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ContractStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pending_signature',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  DISPUTED = 'disputed'
}

export interface ContractTerms {
  scopeOfWork: string;
  deliverables: string[];
  timeline: string;
  paymentTerms: string;
  intellectualProperty: string;
  confidentiality: string;
  terminationClause: string;
  disputeResolution: string;
}

export interface ContractMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  amount: number;
  isCompleted: boolean;
  completedAt?: Date;
  deliverables: string[];
}

export class HiringRequestModel {
  constructor(
    public id: string = '',
    public clientId: string = '',
    public providerId: string = '',
    public serviceId: string = '',
    public eventId: string = '',
    public title: string = '',
    public description: string = '',
    public requirements: string[] = [],
    public budget: { min: number; max: number; currency: string } = { min: 0, max: 0, currency: 'USD' },
    public timeline: { startDate: Date; endDate: Date; isFlexible: boolean } = {
      startDate: new Date(),
      endDate: new Date(),
      isFlexible: false
    },
    public status: HiringStatus = HiringStatus.DRAFT,
    public skillsRequired: string[] = [],
    public experienceLevel: ExperienceLevel = ExperienceLevel.ANY,
    public contractType: ContractType = ContractType.FIXED_PRICE,
    public paymentTerms: PaymentTerms = {
      paymentSchedule: [],
      depositRequired: false,
      depositPercentage: 0,
      latePaymentFee: 0,
      refundPolicy: ''
    },
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public proposals: Proposal[] = [],
    public selectedProposalId: string = ''
  ) {}

  // Add requirement
  addRequirement(requirement: string): void {
    if (!this.requirements.includes(requirement)) {
      this.requirements.push(requirement);
    }
  }

  // Remove requirement
  removeRequirement(requirement: string): void {
    this.requirements = this.requirements.filter(req => req !== requirement);
  }

  // Add skill requirement
  addSkill(skill: string): void {
    if (!this.skillsRequired.includes(skill)) {
      this.skillsRequired.push(skill);
    }
  }

  // Check if hiring request is open for proposals
  isOpenForProposals(): boolean {
    return this.status === HiringStatus.OPEN;
  }

  // Check if timeline is still valid
  isTimelineValid(): boolean {
    return this.timeline.endDate > new Date();
  }

  // Get budget range as string
  getBudgetRange(): string {
    return `${this.budget.currency} ${this.budget.min} - ${this.budget.max}`;
  }

  // Calculate timeline duration in days
  getTimelineDuration(): number {
    return Math.ceil((this.timeline.endDate.getTime() - this.timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Validate hiring request data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title.trim()) errors.push('Title is required');
    if (!this.description.trim()) errors.push('Description is required');
    if (!this.clientId) errors.push('Client ID is required');
    if (!this.serviceId) errors.push('Service ID is required');
    if (this.budget.min < 0) errors.push('Minimum budget cannot be negative');
    if (this.budget.max < this.budget.min) errors.push('Maximum budget must be greater than minimum budget');
    if (this.timeline.startDate >= this.timeline.endDate) errors.push('End date must be after start date');
    if (this.requirements.length === 0) errors.push('At least one requirement is needed');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export class ProposalModel {
  constructor(
    public id: string = '',
    public providerId: string = '',
    public hiringRequestId: string = '',
    public title: string = '',
    public description: string = '',
    public proposedBudget: number = 0,
    public timeline: { startDate: Date; endDate: Date } = {
      startDate: new Date(),
      endDate: new Date()
    },
    public deliverables: string[] = [],
    public terms: string[] = [],
    public status: ProposalStatus = ProposalStatus.SUBMITTED,
    public submittedAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public clientFeedback: string = '',
    public revisions: ProposalRevision[] = []
  ) {}

  // Add deliverable
  addDeliverable(deliverable: string): void {
    if (!this.deliverables.includes(deliverable)) {
      this.deliverables.push(deliverable);
    }
  }

  // Add term
  addTerm(term: string): void {
    if (!this.terms.includes(term)) {
      this.terms.push(term);
    }
  }

  // Check if proposal is still active
  isActive(): boolean {
    return this.status === ProposalStatus.SUBMITTED || 
           this.status === ProposalStatus.UNDER_REVIEW ||
           this.status === ProposalStatus.REVISED;
  }

  // Calculate proposal duration in days
  getDuration(): number {
    return Math.ceil((this.timeline.endDate.getTime() - this.timeline.startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Validate proposal data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.title.trim()) errors.push('Proposal title is required');
    if (!this.description.trim()) errors.push('Proposal description is required');
    if (!this.providerId) errors.push('Provider ID is required');
    if (!this.hiringRequestId) errors.push('Hiring request ID is required');
    if (this.proposedBudget < 0) errors.push('Proposed budget cannot be negative');
    if (this.timeline.startDate >= this.timeline.endDate) errors.push('End date must be after start date');
    if (this.deliverables.length === 0) errors.push('At least one deliverable is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
















