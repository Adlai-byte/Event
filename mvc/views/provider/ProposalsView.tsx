import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonCard } from '../../components/ui';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { semantic } from '../../theme';

interface ProposalsViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface Proposal {
  id: string;
  hiringRequestId: string;
  title: string;
  description: string;
  proposedBudget: number;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'revised' | 'withdrawn';
  submittedAt: string;
  clientName: string;
  hiringRequestTitle: string;
}

interface HiringRequest {
  id: string;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  startDate: string;
  endDate: string;
  city: string;
  status: string;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-proposals' | 'available-requests'>('my-proposals');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for new proposal
  const [newProposal, setNewProposal] = useState({
    hiringRequestId: '',
    title: '',
    description: '',
    proposedBudget: '',
    startDate: '',
    endDate: '',
  });
  const [showProposalForm, setShowProposalForm] = useState(false);

  useEffect(() => {
    loadProposals();
    loadHiringRequests();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/proposals?providerId=${user?.uid}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: Proposal[] = data.rows.map((p: any) => ({
            id: p.idproposal.toString(),
            hiringRequestId: p.p_hiring_request_id.toString(),
            title: p.p_title,
            description: p.p_description,
            proposedBudget: parseFloat(p.p_proposed_budget) || 0,
            status: p.p_status,
            submittedAt: p.p_submitted_at,
            clientName: p.client_name || 'Unknown Client',
            hiringRequestTitle: p.hiring_request_title || 'Hiring Request',
          }));
          setProposals(mapped);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHiringRequests = async () => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/hiring-requests?status=open`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: HiringRequest[] = data.rows.map((hr: any) => ({
            id: hr.idhiring_request.toString(),
            title: hr.hr_title,
            description: hr.hr_description,
            budgetMin: parseFloat(hr.hr_budget_min) || 0,
            budgetMax: parseFloat(hr.hr_budget_max) || 0,
            startDate: hr.hr_start_date,
            endDate: hr.hr_end_date,
            city: hr.hr_city,
            status: hr.hr_status,
          }));
          setHiringRequests(mapped);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading hiring requests:', error);
    }
  };

  const handleSubmitProposal = async () => {
    if (!newProposal.hiringRequestId || !newProposal.title || !newProposal.proposedBudget) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: user?.uid,
          hiringRequestId: newProposal.hiringRequestId,
          title: newProposal.title,
          description: newProposal.description,
          proposedBudget: parseFloat(newProposal.proposedBudget),
          startDate: newProposal.startDate,
          endDate: newProposal.endDate,
        }),
      });

      if (resp.ok) {
        Alert.alert('Success', 'Proposal submitted successfully');
        setNewProposal({
          hiringRequestId: '',
          title: '',
          description: '',
          proposedBudget: '',
          startDate: '',
          endDate: '',
        });
        setShowProposalForm(false);
        loadProposals();
      } else {
        Alert.alert('Error', 'Failed to submit proposal');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit proposal');
    }
  };

  const filteredProposals = proposals.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hiringRequestTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredHiringRequests = hiringRequests.filter((hr) => {
    const matchesSearch =
      !searchQuery ||
      hr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hr.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const statusFilters = [
    'all',
    'submitted',
    'under_review',
    'accepted',
    'rejected',
    'revised',
    'withdrawn',
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return semantic.warning;
      case 'under_review':
        return semantic.primary;
      case 'accepted':
        return semantic.success;
      case 'rejected':
        return semantic.error;
      case 'revised':
        return '#8b5cf6';
      case 'withdrawn':
        return semantic.textSecondary;
      default:
        return semantic.textSecondary;
    }
  };

  return (
    <AppLayout
      role="provider"
      activeRoute="proposals"
      title="Proposals"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'my-proposals' && styles.tabButtonActive]}
            onPress={() => setActiveTab('my-proposals')}
            accessibilityRole="button"
            accessibilityLabel="My proposals tab"
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'my-proposals' && styles.tabButtonTextActive,
              ]}
            >
              My Proposals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'available-requests' && styles.tabButtonActive]}
            onPress={() => setActiveTab('available-requests')}
            accessibilityRole="button"
            accessibilityLabel="Available requests tab"
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'available-requests' && styles.tabButtonTextActive,
              ]}
            >
              Available Requests
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'my-proposals' && (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search proposals by title, description, client, or hiring request..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={semantic.textMuted}
                accessibilityLabel="Search proposals"
              />
            </View>

            {/* Status Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
            >
              {statusFilters.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                  onPress={() => setFilterStatus(status)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${status}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status.replace('_', ' ').charAt(0).toUpperCase() +
                      status.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={{ padding: 16 }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <>
                {filteredProposals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather
                      name="file-text"
                      size={48}
                      color={semantic.textSecondary}
                      style={{ marginBottom: 16 }}
                    />
                    <Text style={styles.emptyStateText}>No proposals found</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {filterStatus === 'all'
                        ? "You haven't submitted any proposals yet"
                        : `No ${filterStatus} proposals`}
                    </Text>
                  </View>
                ) : (
                  filteredProposals.map((proposal) => (
                    <View key={proposal.id} style={styles.proposalCard}>
                      <View style={styles.proposalHeader}>
                        <View style={styles.proposalTitleSection}>
                          <Text style={styles.proposalTitle}>{proposal.title}</Text>
                          <Text style={styles.proposalHiringRequest}>
                            {proposal.hiringRequestTitle}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(proposal.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[styles.statusText, { color: getStatusColor(proposal.status) }]}
                          >
                            {proposal.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.proposalDescription} numberOfLines={3}>
                        {proposal.description}
                      </Text>

                      <View style={styles.proposalDetails}>
                        <View style={styles.proposalDetailRow}>
                          <Text style={styles.proposalDetailLabel}>Client:</Text>
                          <Text style={styles.proposalDetailValue}>{proposal.clientName}</Text>
                        </View>
                        <View style={styles.proposalDetailRow}>
                          <Text style={styles.proposalDetailLabel}>Proposed Budget:</Text>
                          <Text style={[styles.proposalDetailValue, styles.proposalBudget]}>
                            ₱ {proposal.proposedBudget.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.proposalDetailRow}>
                          <Text style={styles.proposalDetailLabel}>Submitted:</Text>
                          <Text style={styles.proposalDetailValue}>
                            {new Date(proposal.submittedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.proposalActions}>
                        {proposal.status === 'submitted' && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.withdrawButton]}
                            accessibilityRole="button"
                            accessibilityLabel={`Withdraw proposal ${proposal.title}`}
                            onPress={() => {
                              Alert.alert(
                                'Withdraw Proposal',
                                'Are you sure you want to withdraw this proposal?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Withdraw', onPress: () => {} },
                                ],
                              );
                            }}
                          >
                            <Text style={styles.actionButtonText}>Withdraw</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'available-requests' && (
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search hiring requests by title, description, or city..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={semantic.textMuted}
                accessibilityLabel="Search hiring requests"
              />
            </View>

            {filteredHiringRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="search"
                  size={48}
                  color={semantic.textSecondary}
                  style={{ marginBottom: 16 }}
                />
                <Text style={styles.emptyStateText}>No available requests</Text>
                <Text style={styles.emptyStateSubtext}>
                  Check back later for new hiring requests
                </Text>
              </View>
            ) : (
              filteredHiringRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                      <Text style={[styles.statusText, { color: semantic.success }]}>OPEN</Text>
                    </View>
                  </View>

                  <Text style={styles.requestDescription} numberOfLines={3}>
                    {request.description}
                  </Text>

                  <View style={styles.requestDetails}>
                    <View style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Budget Range:</Text>
                      <Text style={styles.requestDetailValue}>
                        ₱ {request.budgetMin.toLocaleString()} - ₱{' '}
                        {request.budgetMax.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Location:</Text>
                      <Text style={styles.requestDetailValue}>{request.city}</Text>
                    </View>
                    <View style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Duration:</Text>
                      <Text style={styles.requestDetailValue}>
                        {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.submitProposalButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Submit proposal for ${request.title}`}
                    onPress={() => {
                      setNewProposal({ ...newProposal, hiringRequestId: request.id });
                      setShowProposalForm(true);
                    }}
                  >
                    <Text style={styles.submitProposalButtonText}>Submit Proposal</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* Proposal Form Modal */}
        {showProposalForm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Proposal</Text>
                <TouchableOpacity
                  onPress={() => setShowProposalForm(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close proposal form"
                >
                  <Feather name="x" size={24} color={semantic.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.formLabel}>Proposal Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter proposal title"
                  value={newProposal.title}
                  onChangeText={(text) => setNewProposal({ ...newProposal, title: text })}
                  accessibilityLabel="Proposal title"
                />

                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Describe your proposal"
                  multiline
                  numberOfLines={4}
                  value={newProposal.description}
                  onChangeText={(text) => setNewProposal({ ...newProposal, description: text })}
                  accessibilityLabel="Proposal description"
                />

                <Text style={styles.formLabel}>Proposed Budget (₱) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter proposed budget"
                  keyboardType="numeric"
                  value={newProposal.proposedBudget}
                  onChangeText={(text) => setNewProposal({ ...newProposal, proposedBudget: text })}
                  accessibilityLabel="Proposed budget"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelModalButton]}
                    onPress={() => setShowProposalForm(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel proposal"
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitModalButton]}
                    onPress={handleSubmitProposal}
                    accessibilityRole="button"
                    accessibilityLabel="Submit proposal"
                  >
                    <Text style={[styles.modalButtonText, styles.submitModalButtonText]}>
                      Submit
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
};

const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    main: {
      flex: 1,
    },
    mainContent: {
      padding: isMobile ? 12 : 20,
      paddingBottom: isMobile ? 20 : 20,
    },
    tabContainer: {
      flexDirection: 'row',
      marginBottom: isMobile ? 12 : 20,
      backgroundColor: semantic.surface,
      flexWrap: 'wrap',
      borderRadius: 8,
      padding: 4,
    },
    tabButton: {
      flex: isMobile ? undefined : 1,
      minWidth: isMobile ? (screenWidth - 48) / 2 : undefined,
      paddingVertical: isMobile ? 8 : 10,
      paddingHorizontal: isMobile ? 12 : 20,
      borderRadius: 6,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: {
      backgroundColor: semantic.primary,
      elevation: 2,
      shadowColor: semantic.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    tabButtonText: {
      fontSize: isMobile ? 12 : 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    tabButtonTextActive: {
      color: semantic.surface,
      fontWeight: '700',
    },
    filterContainer: {
      marginBottom: 20,
    },
    filterChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: semantic.surface,
      marginRight: 8,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    filterChipActive: {
      backgroundColor: semantic.primary,
      borderColor: semantic.primary,
    },
    filterChipText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: semantic.surface,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: semantic.textSecondary,
    },
    proposalCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    proposalHeader: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'flex-start',
      marginBottom: 12,
      gap: isMobile ? 8 : 0,
    },
    proposalTitleSection: {
      flex: 1,
    },
    proposalTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    proposalHiringRequest: {
      fontSize: isMobile ? 12 : 14,
      color: semantic.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
    },
    proposalDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    proposalDetails: {
      marginBottom: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    proposalDetailRow: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: isMobile ? 4 : 0,
    },
    proposalDetailLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    proposalDetailValue: {
      fontSize: 14,
      color: semantic.textPrimary,
      flex: 1,
      textAlign: 'right',
    },
    proposalBudget: {
      fontWeight: '700',
      color: semantic.primary,
    },
    proposalActions: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    viewButton: {
      backgroundColor: semantic.primary,
    },
    withdrawButton: {
      backgroundColor: semantic.error,
    },
    actionButtonText: {
      color: semantic.surface,
      fontSize: 14,
      fontWeight: '600',
    },
    requestCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    requestHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    requestTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
      flex: 1,
    },
    requestDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    requestDetails: {
      marginBottom: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    requestDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    requestDetailLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    requestDetailValue: {
      fontSize: 14,
      color: semantic.textPrimary,
      flex: 1,
      textAlign: 'right',
    },
    submitProposalButton: {
      backgroundColor: semantic.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    submitProposalButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      width: '90%',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    modalClose: {
      fontSize: 24,
      color: semantic.textSecondary,
    },
    modalBody: {
      padding: 16,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginTop: 12,
      marginBottom: 6,
    },
    formInput: {
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 6,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: semantic.background,
    },
    searchContainer: {
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    searchInput: {
      backgroundColor: semantic.surface,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: semantic.textPrimary,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelModalButton: {
      backgroundColor: semantic.background,
    },
    submitModalButton: {
      backgroundColor: semantic.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textSecondary,
    },
    submitModalButtonText: {
      color: semantic.surface,
    },
  });

export default ProposalsView;
