import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  HiringRequest,
  HiringStatus,
  Proposal,
  ProposalStatus,
  HiringContract,
  ContractStatus,
  ExperienceLevel,
  ContractType,
  HiringRequestModel,
  ProposalModel,
} from '../models/Hiring';

export class HiringService {
  private static instance: HiringService;
  private unsubscribeFunctions: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): HiringService {
    if (!HiringService.instance) {
      HiringService.instance = new HiringService();
    }
    return HiringService.instance;
  }

  // Create hiring request
  async createHiringRequest(
    hiringData: Partial<HiringRequest>,
  ): Promise<{ success: boolean; hiringRequestId?: string; error?: string }> {
    try {
      const hiringRequest = new HiringRequestModel(
        '',
        hiringData.clientId || '',
        hiringData.providerId || '',
        hiringData.serviceId || '',
        hiringData.eventId || '',
        hiringData.title || '',
        hiringData.description || '',
        hiringData.requirements || [],
        hiringData.budget || { min: 0, max: 0, currency: 'USD' },
        hiringData.timeline || { startDate: new Date(), endDate: new Date(), isFlexible: false },
        hiringData.status || HiringStatus.DRAFT,
        hiringData.skillsRequired || [],
        hiringData.experienceLevel || ExperienceLevel.ANY,
        hiringData.contractType || ContractType.FIXED_PRICE,
        hiringData.paymentTerms || {
          paymentSchedule: [],
          depositRequired: false,
          depositPercentage: 0,
          latePaymentFee: 0,
          refundPolicy: '',
        },
        new Date(),
        new Date(),
        [],
        '',
      );

      const validation = hiringRequest.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      const hiringRef = await addDoc(collection(db, 'hiringRequests'), {
        ...hiringData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        hiringRequestId: hiringRef.id,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error creating hiring request:', error);
      return {
        success: false,
        error: error.message || 'Failed to create hiring request',
      };
    }
  }

  // Update hiring request
  async updateHiringRequest(
    hiringRequestId: string,
    updates: Partial<HiringRequest>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const hiringRef = doc(db, 'hiringRequests', hiringRequestId);
      await updateDoc(hiringRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error updating hiring request:', error);
      return {
        success: false,
        error: error.message || 'Failed to update hiring request',
      };
    }
  }

  // Get hiring request by ID
  async getHiringRequest(hiringRequestId: string): Promise<HiringRequest | null> {
    try {
      const hiringRef = doc(db, 'hiringRequests', hiringRequestId);
      const hiringSnap = await getDoc(hiringRef);

      if (hiringSnap.exists()) {
        const data = hiringSnap.data();
        return {
          id: hiringSnap.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as HiringRequest;
      }
      return null;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting hiring request:', error);
      return null;
    }
  }

  // Get hiring requests by client
  async getClientHiringRequests(clientId: string): Promise<HiringRequest[]> {
    try {
      const q = query(
        collection(db, 'hiringRequests'),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const hiringRequests: HiringRequest[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        hiringRequests.push({
          id: doc.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as HiringRequest);
      });

      return hiringRequests;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting client hiring requests:', error);
      return [];
    }
  }

  // Get available hiring requests for providers
  async getAvailableHiringRequests(
    category?: string,
    maxBudget?: number,
    location?: string,
  ): Promise<HiringRequest[]> {
    try {
      let q = query(
        collection(db, 'hiringRequests'),
        where('status', '==', HiringStatus.OPEN),
        orderBy('createdAt', 'desc'),
      );

      if (category) {
        q = query(q, where('serviceId', '==', category));
      }

      const querySnapshot = await getDocs(q);
      const hiringRequests: HiringRequest[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const hiringRequest = {
          id: doc.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as HiringRequest;

        // Apply filters
        if (maxBudget && hiringRequest.budget.max > maxBudget) return;
        if (location && !hiringRequest.location.city.toLowerCase().includes(location.toLowerCase()))
          return;

        hiringRequests.push(hiringRequest);
      });

      return hiringRequests;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting available hiring requests:', error);
      return [];
    }
  }

  // Submit proposal
  async submitProposal(
    proposalData: Partial<Proposal>,
  ): Promise<{ success: boolean; proposalId?: string; error?: string }> {
    try {
      const proposal = new ProposalModel(
        '',
        proposalData.providerId || '',
        proposalData.hiringRequestId || '',
        proposalData.title || '',
        proposalData.description || '',
        proposalData.proposedBudget || 0,
        proposalData.timeline || { startDate: new Date(), endDate: new Date() },
        proposalData.deliverables || [],
        proposalData.terms || [],
        proposalData.status || ProposalStatus.SUBMITTED,
        new Date(),
        new Date(),
        proposalData.clientFeedback || '',
        proposalData.revisions || [],
      );

      const validation = proposal.validate();
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      const proposalRef = await addDoc(collection(db, 'proposals'), {
        ...proposalData,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update hiring request with proposal count
      await this.updateHiringRequestProposalCount(proposalData.hiringRequestId!);

      return {
        success: true,
        proposalId: proposalRef.id,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error submitting proposal:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit proposal',
      };
    }
  }

  // Get proposals for hiring request
  async getHiringRequestProposals(hiringRequestId: string): Promise<Proposal[]> {
    try {
      const q = query(
        collection(db, 'proposals'),
        where('hiringRequestId', '==', hiringRequestId),
        orderBy('submittedAt', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const proposals: Proposal[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        proposals.push({
          id: doc.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          submittedAt: data.submittedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Proposal);
      });

      return proposals;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting hiring request proposals:', error);
      return [];
    }
  }

  // Get provider's proposals
  async getProviderProposals(providerId: string): Promise<Proposal[]> {
    try {
      const q = query(
        collection(db, 'proposals'),
        where('providerId', '==', providerId),
        orderBy('submittedAt', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const proposals: Proposal[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        proposals.push({
          id: doc.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          submittedAt: data.submittedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Proposal);
      });

      return proposals;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting provider proposals:', error);
      return [];
    }
  }

  // Accept proposal
  async acceptProposal(
    proposalId: string,
    hiringRequestId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const batch = writeBatch(db);

      // Update proposal status
      const proposalRef = doc(db, 'proposals', proposalId);
      batch.update(proposalRef, {
        status: ProposalStatus.ACCEPTED,
        updatedAt: serverTimestamp(),
      });

      // Update hiring request status
      const hiringRef = doc(db, 'hiringRequests', hiringRequestId);
      batch.update(hiringRef, {
        status: HiringStatus.CLOSED,
        selectedProposalId: proposalId,
        updatedAt: serverTimestamp(),
      });

      // Reject other proposals for this hiring request
      const otherProposals = await this.getHiringRequestProposals(hiringRequestId);
      for (const proposal of otherProposals) {
        if (proposal.id !== proposalId) {
          const otherProposalRef = doc(db, 'proposals', proposal.id);
          batch.update(otherProposalRef, {
            status: ProposalStatus.REJECTED,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error accepting proposal:', error);
      return {
        success: false,
        error: error.message || 'Failed to accept proposal',
      };
    }
  }

  // Reject proposal
  async rejectProposal(
    proposalId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const proposalRef = doc(db, 'proposals', proposalId);
      await updateDoc(proposalRef, {
        status: ProposalStatus.REJECTED,
        clientFeedback: reason || 'Proposal rejected',
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error rejecting proposal:', error);
      return {
        success: false,
        error: error.message || 'Failed to reject proposal',
      };
    }
  }

  // Create hiring contract
  async createHiringContract(
    contractData: Partial<HiringContract>,
  ): Promise<{ success: boolean; contractId?: string; error?: string }> {
    try {
      const contractRef = await addDoc(collection(db, 'hiringContracts'), {
        ...contractData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        contractId: contractRef.id,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error creating hiring contract:', error);
      return {
        success: false,
        error: error.message || 'Failed to create hiring contract',
      };
    }
  }

  // Get hiring contracts
  async getHiringContracts(
    userId: string,
    userType: 'client' | 'provider',
  ): Promise<HiringContract[]> {
    try {
      const field = userType === 'client' ? 'clientId' : 'providerId';
      const q = query(
        collection(db, 'hiringContracts'),
        where(field, '==', userId),
        orderBy('createdAt', 'desc'),
      );

      const querySnapshot = await getDocs(q);
      const contracts: HiringContract[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        contracts.push({
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as HiringContract);
      });

      return contracts;
    } catch (error: any) {
      if (__DEV__) console.error('Error getting hiring contracts:', error);
      return [];
    }
  }

  // Update contract status
  async updateContractStatus(
    contractId: string,
    status: ContractStatus,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const contractRef = doc(db, 'hiringContracts', contractId);
      await updateDoc(contractRef, {
        status,
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Error updating contract status:', error);
      return {
        success: false,
        error: error.message || 'Failed to update contract status',
      };
    }
  }

  // Real-time hiring request updates
  subscribeToHiringRequests(
    userId: string,
    userType: 'client' | 'provider',
    callback: (hiringRequests: HiringRequest[]) => void,
  ): () => void {
    const field = userType === 'client' ? 'clientId' : 'providerId';
    const q = query(
      collection(db, 'hiringRequests'),
      where(field, '==', userId),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const hiringRequests: HiringRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        hiringRequests.push({
          id: doc.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as HiringRequest);
      });
      callback(hiringRequests);
    });

    this.unsubscribeFunctions.set(`hiring_${userId}`, unsubscribe);
    return unsubscribe;
  }

  // Real-time proposal updates
  subscribeToProposals(
    userId: string,
    userType: 'client' | 'provider',
    callback: (proposals: Proposal[]) => void,
  ): () => void {
    const field = userType === 'provider' ? 'providerId' : 'clientId';
    const q = query(
      collection(db, 'proposals'),
      where(field, '==', userId),
      orderBy('submittedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const proposals: Proposal[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        proposals.push({
          id: doc.id,
          ...data,
          timeline: {
            ...data.timeline,
            startDate: data.timeline.startDate?.toDate() || new Date(),
            endDate: data.timeline.endDate?.toDate() || new Date(),
          },
          submittedAt: data.submittedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Proposal);
      });
      callback(proposals);
    });

    this.unsubscribeFunctions.set(`proposals_${userId}`, unsubscribe);
    return unsubscribe;
  }

  // Private helper methods
  private async updateHiringRequestProposalCount(hiringRequestId: string): Promise<void> {
    try {
      const hiringRef = doc(db, 'hiringRequests', hiringRequestId);
      const proposals = await this.getHiringRequestProposals(hiringRequestId);

      await updateDoc(hiringRef, {
        proposalCount: proposals.length,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      if (__DEV__) console.error('Error updating proposal count:', error);
    }
  }

  // Cleanup subscriptions
  cleanup(): void {
    this.unsubscribeFunctions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribeFunctions.clear();
  }
}
