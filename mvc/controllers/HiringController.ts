import { MySQLHiringService } from '../services/MySQLHiringService';
import { MessagingService } from '../services/MessagingService';
import {
  HiringRequest,
  HiringStatus,
  Proposal,
  HiringContract,
  ContractStatus,
} from '../models/Hiring';

export class HiringController {
  private hiringService: MySQLHiringService;
  private messagingService: MessagingService;

  constructor() {
    this.hiringService = MySQLHiringService.getInstance();
    this.messagingService = MessagingService.getInstance();
  }

  // Create hiring request
  async createHiringRequest(
    hiringData: Partial<HiringRequest>,
  ): Promise<{ success: boolean; hiringRequestId?: string; error?: string }> {
    try {
      const result = await this.hiringService.createHiringRequest(hiringData);

      if (result.success && result.hiringRequestId) {
        // Send notification to potential providers
        await this.notifyProvidersOfNewHiringRequest(result.hiringRequestId);
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.createHiringRequest:', error);
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
      return await this.hiringService.updateHiringRequest(hiringRequestId, updates);
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.updateHiringRequest:', error);
      return {
        success: false,
        error: error.message || 'Failed to update hiring request',
      };
    }
  }

  // Publish hiring request
  async publishHiringRequest(
    hiringRequestId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.hiringService.updateHiringRequest(hiringRequestId, {
        status: HiringStatus.OPEN,
      });

      if (result.success) {
        // Send notification to potential providers
        await this.notifyProvidersOfNewHiringRequest(hiringRequestId);
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.publishHiringRequest:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish hiring request',
      };
    }
  }

  // Get hiring request by ID
  async getHiringRequest(
    hiringRequestId: string,
  ): Promise<{ success: boolean; hiringRequest?: HiringRequest; error?: string }> {
    try {
      const hiringRequest = await this.hiringService.getHiringRequest(hiringRequestId);
      if (hiringRequest) {
        return {
          success: true,
          hiringRequest,
        };
      } else {
        return {
          success: false,
          error: 'Hiring request not found',
        };
      }
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.getHiringRequest:', error);
      return {
        success: false,
        error: error.message || 'Failed to get hiring request',
      };
    }
  }

  // Get client's hiring requests
  async getClientHiringRequests(
    clientId: string,
  ): Promise<{ success: boolean; hiringRequests?: HiringRequest[]; error?: string }> {
    try {
      const hiringRequests = await this.hiringService.getClientHiringRequests(clientId);
      return {
        success: true,
        hiringRequests,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.getClientHiringRequests:', error);
      return {
        success: false,
        error: error.message || 'Failed to get client hiring requests',
      };
    }
  }

  // Get available hiring requests for providers
  async getAvailableHiringRequests(
    _category?: string,
    _maxBudget?: number,
    _location?: string,
  ): Promise<{ success: boolean; hiringRequests?: HiringRequest[]; error?: string }> {
    try {
      const hiringRequests = await this.hiringService.getAvailableHiringRequests();
      return {
        success: true,
        hiringRequests,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.getAvailableHiringRequests:', error);
      return {
        success: false,
        error: error.message || 'Failed to get available hiring requests',
      };
    }
  }

  // Submit proposal
  async submitProposal(
    proposalData: Partial<Proposal>,
  ): Promise<{ success: boolean; proposalId?: string; error?: string }> {
    try {
      const result = await this.hiringService.submitProposal(proposalData);

      if (result.success && result.proposalId) {
        // Send notification to client
        await this.notifyClientOfNewProposal(proposalData.hiringRequestId!, result.proposalId);
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.submitProposal:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit proposal',
      };
    }
  }

  // Get proposals for hiring request
  async getHiringRequestProposals(
    hiringRequestId: string,
  ): Promise<{ success: boolean; proposals?: Proposal[]; error?: string }> {
    try {
      const proposals = await this.hiringService.getHiringRequestProposals(hiringRequestId);
      return {
        success: true,
        proposals,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.getHiringRequestProposals:', error);
      return {
        success: false,
        error: error.message || 'Failed to get hiring request proposals',
      };
    }
  }

  // Get provider's proposals
  async getProviderProposals(
    providerId: string,
  ): Promise<{ success: boolean; proposals?: Proposal[]; error?: string }> {
    try {
      const proposals = await this.hiringService.getProviderProposals(providerId);
      return {
        success: true,
        proposals,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.getProviderProposals:', error);
      return {
        success: false,
        error: error.message || 'Failed to get provider proposals',
      };
    }
  }

  // Accept proposal
  async acceptProposal(
    proposalId: string,
    hiringRequestId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.hiringService.acceptProposal(proposalId, hiringRequestId);

      if (result.success) {
        // Send notification to provider
        await this.notifyProviderOfProposalAcceptance(proposalId, hiringRequestId);

        // Create hiring contract
        await this.createHiringContractFromProposal(proposalId, hiringRequestId);
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.acceptProposal:', error);
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
      const result = await this.hiringService.rejectProposal(proposalId, reason);

      if (result.success) {
        // Send notification to provider
        await this.notifyProviderOfProposalRejection(proposalId, reason);
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.rejectProposal:', error);
      return {
        success: false,
        error: error.message || 'Failed to reject proposal',
      };
    }
  }

  // Get hiring contracts
  async getHiringContracts(
    userId: string,
    userType: 'client' | 'provider',
  ): Promise<{ success: boolean; contracts?: HiringContract[]; error?: string }> {
    try {
      const contracts = await this.hiringService.getHiringContracts(userId, userType);
      return {
        success: true,
        contracts,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.getHiringContracts:', error);
      return {
        success: false,
        error: error.message || 'Failed to get hiring contracts',
      };
    }
  }

  // Update contract status
  async updateContractStatus(
    contractId: string,
    status: ContractStatus,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.hiringService.updateContractStatus(contractId, status);
    } catch (error: any) {
      if (__DEV__) console.error('Error in HiringController.updateContractStatus:', error);
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
    return this.hiringService.subscribeToHiringRequests(userId, userType, callback);
  }

  // Real-time proposal updates
  subscribeToProposals(
    userId: string,
    userType: 'client' | 'provider',
    callback: (proposals: Proposal[]) => void,
  ): () => void {
    return this.hiringService.subscribeToProposals(userId, userType, callback);
  }

  // Private helper methods
  private async notifyProvidersOfNewHiringRequest(hiringRequestId: string): Promise<void> {
    try {
      const hiringRequest = await this.hiringService.getHiringRequest(hiringRequestId);
      if (!hiringRequest) return;

      // This would typically involve:
      // 1. Finding providers who match the service category
      // 2. Sending push notifications
      // 3. Creating system messages
    } catch (error: any) {
      if (__DEV__) console.error('Error notifying providers of new hiring request:', error);
    }
  }

  private async notifyClientOfNewProposal(
    hiringRequestId: string,
    proposalId: string,
  ): Promise<void> {
    try {
      const hiringRequest = await this.hiringService.getHiringRequest(hiringRequestId);
      if (!hiringRequest) return;

      // Create conversation between client and provider
      const conversationResult = await this.messagingService.createOrGetConversation(
        hiringRequest.clientId,
        '', // This would be the provider ID from the proposal
        { hiringRequestId, proposalId, type: 'hiring' },
      );

      if (conversationResult.success && conversationResult.conversationId) {
        await this.messagingService.sendSystemMessage(
          conversationResult.conversationId,
          hiringRequest.clientId,
          'You have received a new proposal for your hiring request.',
          { hiringRequestId, proposalId, actionRequired: true, actionType: 'proposal_review' },
        );
      }
    } catch (error: any) {
      if (__DEV__) console.error('Error notifying client of new proposal:', error);
    }
  }

  private async notifyProviderOfProposalAcceptance(
    _proposalId: string,
    _hiringRequestId: string,
  ): Promise<void> {
    try {
      // This would involve getting the proposal details and notifying the provider
    } catch (error: any) {
      if (__DEV__) console.error('Error notifying provider of proposal acceptance:', error);
    }
  }

  private async notifyProviderOfProposalRejection(
    _proposalId: string,
    _reason?: string,
  ): Promise<void> {
    try {
      // This would involve getting the proposal details and notifying the provider
    } catch (error: any) {
      if (__DEV__) console.error('Error notifying provider of proposal rejection:', error);
    }
  }

  private async createHiringContractFromProposal(
    _proposalId: string,
    _hiringRequestId: string,
  ): Promise<void> {
    try {
      // This would involve:
      // 1. Getting proposal and hiring request details
      // 2. Creating a contract with the agreed terms
      // 3. Setting up payment milestones
    } catch (error: any) {
      if (__DEV__) console.error('Error creating hiring contract from proposal:', error);
    }
  }

  // Cleanup
  cleanup(): void {
    this.hiringService.cleanup();
  }
}
