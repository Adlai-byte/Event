import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { HiringController } from '../../controllers/HiringController';
import { HiringRequest, HiringStatus, Proposal, ProposalStatus, ExperienceLevel, ContractType } from '../../models/Hiring';

const { width, height } = Dimensions.get('window');

interface HiringViewProps {
  userId: string;
  userType: 'client' | 'provider';
  onBack: () => void;
}

export const HiringView: React.FC<HiringViewProps> = ({ userId, userType, onBack }) => {
  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'proposals'>('requests');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedHiringRequest, setSelectedHiringRequest] = useState<HiringRequest | null>(null);

  // Create hiring request form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [requirements, setRequirements] = useState('');
  const [skills, setSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(ExperienceLevel.ANY);
  const [contractType, setContractType] = useState<ContractType>(ContractType.FIXED_PRICE);

  // Create proposal form state
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [proposalStartDate, setProposalStartDate] = useState('');
  const [proposalEndDate, setProposalEndDate] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [terms, setTerms] = useState('');

  const hiringController = new HiringController();

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const unsubscribeRequests = hiringController.subscribeToHiringRequests(
      userId,
      userType,
      (updatedRequests) => {
        setHiringRequests(updatedRequests);
      }
    );

    const unsubscribeProposals = hiringController.subscribeToProposals(
      userId,
      userType,
      (updatedProposals) => {
        setProposals(updatedProposals);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeProposals();
      hiringController.cleanup();
    };
  }, [userId, userType]);

  const loadData = async () => {
    setLoading(true);
    
    if (userType === 'client') {
      const requestsResult = await hiringController.getClientHiringRequests(userId);
      if (requestsResult.success && requestsResult.hiringRequests) {
        setHiringRequests(requestsResult.hiringRequests);
      }
    } else {
      const requestsResult = await hiringController.getAvailableHiringRequests();
      if (requestsResult.success && requestsResult.hiringRequests) {
        setHiringRequests(requestsResult.hiringRequests);
      }
    }

    const proposalsResult = await hiringController.getProviderProposals(userId);
    if (proposalsResult.success && proposalsResult.proposals) {
      setProposals(proposalsResult.proposals);
    }

    setLoading(false);
  };

  const handleCreateHiringRequest = async () => {
    if (!title || !description || !serviceId || !minBudget || !maxBudget || !startDate || !endDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const requirementsList = requirements.split(',').map(req => req.trim()).filter(req => req);
    const skillsList = skills.split(',').map(skill => skill.trim()).filter(skill => skill);

    setLoading(true);
    const result = await hiringController.createHiringRequest({
      clientId: userId,
      title,
      description,
      serviceId,
      budget: {
        min: parseFloat(minBudget),
        max: parseFloat(maxBudget),
        currency: 'USD'
      },
      timeline: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isFlexible: false
      },
      requirements: requirementsList,
      skillsRequired: skillsList,
      experienceLevel,
      contractType,
      status: HiringStatus.DRAFT
    });

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Hiring request created successfully!');
      setShowCreateForm(false);
      resetCreateForm();
    } else {
      Alert.alert('Error', result.error || 'Failed to create hiring request');
    }
  };

  const handlePublishHiringRequest = async (hiringRequestId: string) => {
    const result = await hiringController.publishHiringRequest(hiringRequestId);
    if (result.success) {
      Alert.alert('Success', 'Hiring request published successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to publish hiring request');
    }
  };

  const handleSubmitProposal = async () => {
    if (!proposalTitle || !proposalDescription || !proposedBudget || !proposalStartDate || !proposalEndDate || !deliverables) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedHiringRequest) {
      Alert.alert('Error', 'No hiring request selected');
      return;
    }

    const deliverablesList = deliverables.split(',').map(del => del.trim()).filter(del => del);
    const termsList = terms.split(',').map(term => term.trim()).filter(term => term);

    setLoading(true);
    const result = await hiringController.submitProposal({
      providerId: userId,
      hiringRequestId: selectedHiringRequest.id,
      title: proposalTitle,
      description: proposalDescription,
      proposedBudget: parseFloat(proposedBudget),
      timeline: {
        startDate: new Date(proposalStartDate),
        endDate: new Date(proposalEndDate)
      },
      deliverables: deliverablesList,
      terms: termsList,
      status: ProposalStatus.SUBMITTED
    });

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Proposal submitted successfully!');
      setShowProposalForm(false);
      resetProposalForm();
    } else {
      Alert.alert('Error', result.error || 'Failed to submit proposal');
    }
  };

  const handleAcceptProposal = async (proposalId: string, hiringRequestId: string) => {
    Alert.alert(
      'Accept Proposal',
      'Are you sure you want to accept this proposal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            const result = await hiringController.acceptProposal(proposalId, hiringRequestId);
            if (result.success) {
              Alert.alert('Success', 'Proposal accepted successfully!');
            } else {
              Alert.alert('Error', result.error || 'Failed to accept proposal');
            }
          }
        }
      ]
    );
  };

  const handleRejectProposal = async (proposalId: string) => {
    Alert.prompt(
      'Reject Proposal',
      'Please provide a reason for rejection (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            const result = await hiringController.rejectProposal(proposalId, reason);
            if (result.success) {
              Alert.alert('Success', 'Proposal rejected');
            } else {
              Alert.alert('Error', result.error || 'Failed to reject proposal');
            }
          }
        }
      ]
    );
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setServiceId('');
    setMinBudget('');
    setMaxBudget('');
    setStartDate('');
    setEndDate('');
    setRequirements('');
    setSkills('');
    setExperienceLevel(ExperienceLevel.ANY);
    setContractType(ContractType.FIXED_PRICE);
  };

  const resetProposalForm = () => {
    setProposalTitle('');
    setProposalDescription('');
    setProposedBudget('');
    setProposalStartDate('');
    setProposalEndDate('');
    setDeliverables('');
    setTerms('');
    setSelectedHiringRequest(null);
  };

  const getStatusColor = (status: HiringStatus | ProposalStatus): string => {
    switch (status) {
      case HiringStatus.DRAFT: return '#FFA500';
      case HiringStatus.OPEN: return '#4CAF50';
      case HiringStatus.IN_REVIEW: return '#2196F3';
      case HiringStatus.CLOSED: return '#9C27B0';
      case HiringStatus.CANCELLED: return '#F44336';
      case ProposalStatus.SUBMITTED: return '#FFA500';
      case ProposalStatus.UNDER_REVIEW: return '#2196F3';
      case ProposalStatus.ACCEPTED: return '#4CAF50';
      case ProposalStatus.REJECTED: return '#F44336';
      case ProposalStatus.REVISED: return '#FF9800';
      case ProposalStatus.WITHDRAWN: return '#757575';
      default: return '#757575';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  if (loading && hiringRequests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userType === 'client' ? 'Hiring Requests' : 'Available Jobs'}
        </Text>
        {userType === 'client' && (
          <TouchableOpacity 
            onPress={() => setShowCreateForm(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            {userType === 'client' ? 'My Requests' : 'Available Jobs'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'proposals' && styles.activeTab]}
          onPress={() => setActiveTab('proposals')}
        >
          <Text style={[styles.tabText, activeTab === 'proposals' && styles.activeTabText]}>
            My Proposals
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'requests' ? (
          // Hiring Requests
          <>
            {hiringRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
                  </View>
                </View>
                
                <Text style={styles.requestDescription}>{request.description}</Text>
                
                <View style={styles.requestDetails}>
                  <Text style={styles.requestDetail}>
                    Budget: {formatCurrency(request.budget.min)} - {formatCurrency(request.budget.max)}
                  </Text>
                  <Text style={styles.requestDetail}>
                    Timeline: {formatDate(request.timeline.startDate)} - {formatDate(request.timeline.endDate)}
                  </Text>
                  <Text style={styles.requestDetail}>
                    Experience: {request.experienceLevel}
                  </Text>
                  <Text style={styles.requestDetail}>
                    Contract: {request.contractType.replace('_', ' ')}
                  </Text>
                </View>

                {request.requirements.length > 0 && (
                  <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    {request.requirements.map((req, index) => (
                      <Text key={index} style={styles.requirementItem}>• {req}</Text>
                    ))}
                  </View>
                )}

                {userType === 'provider' && request.status === HiringStatus.OPEN && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedHiringRequest(request);
                      setShowProposalForm(true);
                    }}
                    style={styles.proposeButton}
                  >
                    <Text style={styles.proposeButtonText}>Submit Proposal</Text>
                  </TouchableOpacity>
                )}

                {userType === 'client' && request.status === HiringStatus.DRAFT && (
                  <TouchableOpacity
                    onPress={() => handlePublishHiringRequest(request.id)}
                    style={styles.publishButton}
                  >
                    <Text style={styles.publishButtonText}>Publish</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {hiringRequests.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {userType === 'client' ? 'No hiring requests yet' : 'No available jobs'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {userType === 'client' 
                    ? 'Create your first hiring request to get started'
                    : 'Check back later for new opportunities'
                  }
                </Text>
              </View>
            )}
          </>
        ) : (
          // Proposals
          <>
            {proposals.map((proposal) => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <Text style={styles.proposalTitle}>{proposal.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) }]}>
                    <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
                  </View>
                </View>
                
                <Text style={styles.proposalDescription}>{proposal.description}</Text>
                
                <View style={styles.proposalDetails}>
                  <Text style={styles.proposalDetail}>
                    Budget: {formatCurrency(proposal.proposedBudget)}
                  </Text>
                  <Text style={styles.proposalDetail}>
                    Timeline: {formatDate(proposal.timeline.startDate)} - {formatDate(proposal.timeline.endDate)}
                  </Text>
                </View>

                {proposal.deliverables.length > 0 && (
                  <View style={styles.deliverablesContainer}>
                    <Text style={styles.deliverablesTitle}>Deliverables:</Text>
                    {proposal.deliverables.map((del, index) => (
                      <Text key={index} style={styles.deliverableItem}>• {del}</Text>
                    ))}
                  </View>
                )}

                {proposal.clientFeedback && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackTitle}>Client Feedback:</Text>
                    <Text style={styles.feedbackText}>{proposal.clientFeedback}</Text>
                  </View>
                )}
              </View>
            ))}

            {proposals.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No proposals yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Submit proposals to available jobs to get started
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Hiring Request Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateForm(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Hiring Request</Text>
            <TouchableOpacity onPress={handleCreateHiringRequest}>
              <Text style={styles.modalSaveButton}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter job title"
            />

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the job requirements"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Service ID *</Text>
            <TextInput
              style={styles.formInput}
              value={serviceId}
              onChangeText={setServiceId}
              placeholder="Enter service ID"
            />

            <View style={styles.budgetContainer}>
              <View style={styles.budgetInput}>
                <Text style={styles.formLabel}>Min Budget *</Text>
                <TextInput
                  style={styles.formInput}
                  value={minBudget}
                  onChangeText={setMinBudget}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.budgetInput}>
                <Text style={styles.formLabel}>Max Budget *</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxBudget}
                  onChangeText={setMaxBudget}
                  placeholder="1000"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>Start Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>End Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Requirements (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={requirements}
              onChangeText={setRequirements}
              placeholder="Requirement 1, Requirement 2, ..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Required Skills (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={skills}
              onChangeText={setSkills}
              placeholder="Skill 1, Skill 2, ..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Create Proposal Modal */}
      <Modal
        visible={showProposalForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProposalForm(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Proposal</Text>
            <TouchableOpacity onPress={handleSubmitProposal}>
              <Text style={styles.modalSaveButton}>Submit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Proposal Title *</Text>
            <TextInput
              style={styles.formInput}
              value={proposalTitle}
              onChangeText={setProposalTitle}
              placeholder="Enter proposal title"
            />

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={proposalDescription}
              onChangeText={setProposalDescription}
              placeholder="Describe your approach and qualifications"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Proposed Budget *</Text>
            <TextInput
              style={styles.formInput}
              value={proposedBudget}
              onChangeText={setProposedBudget}
              placeholder="1000"
              keyboardType="numeric"
            />

            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>Start Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={proposalStartDate}
                  onChangeText={setProposalStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>End Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={proposalEndDate}
                  onChangeText={setProposalEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Deliverables * (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={deliverables}
              onChangeText={setDeliverables}
              placeholder="Deliverable 1, Deliverable 2, ..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Terms (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={terms}
              onChangeText={setTerms}
              placeholder="Term 1, Term 2, ..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C63FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  addButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6C63FF',
  },
  tabText: {
    fontSize: 16,
    color: '#636E72',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    }),
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestDescription: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestDetail: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  requirementsContainer: {
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  requirementItem: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  proposeButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  proposeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    }),
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    lineHeight: 20,
  },
  proposalDetails: {
    marginBottom: 12,
  },
  proposalDetail: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  deliverablesContainer: {
    marginBottom: 12,
  },
  deliverablesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  deliverableItem: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  feedbackContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#636E72',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A4B0BE',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetInput: {
    flex: 1,
    marginRight: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
  },
});


