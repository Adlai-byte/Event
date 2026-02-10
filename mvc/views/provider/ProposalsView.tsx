import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

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
    endDate: ''
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
            hiringRequestTitle: p.hiring_request_title || 'Hiring Request'
          }));
          setProposals(mapped);
        }
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
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
            status: hr.hr_status
          }));
          setHiringRequests(mapped);
        }
      }
    } catch (error) {
      console.error('Error loading hiring requests:', error);
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
          endDate: newProposal.endDate
        })
      });

      if (resp.ok) {
        Alert.alert('Success', 'Proposal submitted successfully');
        setNewProposal({ hiringRequestId: '', title: '', description: '', proposedBudget: '', startDate: '', endDate: '' });
        setShowProposalForm(false);
        loadProposals();
      } else {
        Alert.alert('Error', 'Failed to submit proposal');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit proposal');
    }
  };

  const filteredProposals = proposals.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = !searchQuery || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hiringRequestTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
  
  const filteredHiringRequests = hiringRequests.filter(hr => {
    const matchesSearch = !searchQuery || 
      hr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hr.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  
  const statusFilters = ['all', 'submitted', 'under_review', 'accepted', 'rejected', 'revised', 'withdrawn'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#f59e0b';
      case 'under_review': return '#4a55e1';
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'revised': return '#8b5cf6';
      case 'withdrawn': return '#64748B';
      default: return '#64748B';
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
          >
            <Text style={[styles.tabButtonText, activeTab === 'my-proposals' && styles.tabButtonTextActive]}>My Proposals</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'available-requests' && styles.tabButtonActive]}
            onPress={() => setActiveTab('available-requests')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'available-requests' && styles.tabButtonTextActive]}>Available Requests</Text>
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
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Status Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
              {statusFilters.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a55e1" />
                <Text style={styles.loadingText}>Loading proposals...</Text>
              </View>
            ) : (
              <>
                {filteredProposals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>📝</Text>
                    <Text style={styles.emptyStateText}>No proposals found</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {filterStatus === 'all' 
                        ? 'You haven\'t submitted any proposals yet' 
                        : `No ${filterStatus} proposals`}
                    </Text>
                  </View>
                ) : (
                  filteredProposals.map((proposal) => (
                    <View key={proposal.id} style={styles.proposalCard}>
                      <View style={styles.proposalHeader}>
                        <View style={styles.proposalTitleSection}>
                          <Text style={styles.proposalTitle}>{proposal.title}</Text>
                          <Text style={styles.proposalHiringRequest}>{proposal.hiringRequestTitle}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(proposal.status) }]}>
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
                          <Text style={styles.proposalDetailValue}>{new Date(proposal.submittedAt).toLocaleDateString()}</Text>
                        </View>
                      </View>

                      <View style={styles.proposalActions}>
                        {proposal.status === 'submitted' && (
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.withdrawButton]}
                            onPress={() => {
                              Alert.alert('Withdraw Proposal', 'Are you sure you want to withdraw this proposal?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Withdraw', onPress: () => {} }
                              ]);
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
                placeholderTextColor="#94A3B8"
              />
            </View>

            {filteredHiringRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateText}>No available requests</Text>
                <Text style={styles.emptyStateSubtext}>Check back later for new hiring requests</Text>
              </View>
            ) : (
              filteredHiringRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{request.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                      <Text style={[styles.statusText, { color: '#10b981' }]}>OPEN</Text>
                    </View>
                  </View>

                  <Text style={styles.requestDescription} numberOfLines={3}>
                    {request.description}
                  </Text>

                  <View style={styles.requestDetails}>
                    <View style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Budget Range:</Text>
                      <Text style={styles.requestDetailValue}>
                        ₱ {request.budgetMin.toLocaleString()} - ₱ {request.budgetMax.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Location:</Text>
                      <Text style={styles.requestDetailValue}>{request.city}</Text>
                    </View>
                    <View style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Duration:</Text>
                      <Text style={styles.requestDetailValue}>
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.submitProposalButton}
                    onPress={() => {
                      setNewProposal({...newProposal, hiringRequestId: request.id});
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
                <TouchableOpacity onPress={() => setShowProposalForm(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.formLabel}>Proposal Title *</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="Enter proposal title"
                  value={newProposal.title}
                  onChangeText={(text) => setNewProposal({...newProposal, title: text})}
                />

                <Text style={styles.formLabel}>Description</Text>
                <TextInput 
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Describe your proposal"
                  multiline
                  numberOfLines={4}
                  value={newProposal.description}
                  onChangeText={(text) => setNewProposal({...newProposal, description: text})}
                />

                <Text style={styles.formLabel}>Proposed Budget (₱) *</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="Enter proposed budget"
                  keyboardType="numeric"
                  value={newProposal.proposedBudget}
                  onChangeText={(text) => setNewProposal({...newProposal, proposedBudget: text})}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelModalButton]}
                    onPress={() => setShowProposalForm(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.submitModalButton]}
                    onPress={handleSubmitProposal}
                  >
                    <Text style={[styles.modalButtonText, styles.submitModalButtonText]}>Submit</Text>
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

const styles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#4a55e1',
    elevation: 2,
    shadowColor: '#4a55e1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: isMobile ? 12 : 14,
    color: '#64748B',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
    marginBottom: 4,
  },
  proposalHiringRequest: {
    fontSize: isMobile ? 12 : 14,
    color: '#64748B',
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
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  proposalDetails: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  proposalDetailRow: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: isMobile ? 4 : 0,
  },
  proposalDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  proposalDetailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  proposalBudget: {
    fontWeight: '700',
    color: '#4a55e1',
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#4a55e1',
  },
  withdrawButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
    flex: 1,
  },
  requestDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestDetails: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  requestDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requestDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  requestDetailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  submitProposalButton: {
    backgroundColor: '#4a55e1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitProposalButtonText: {
    color: '#FFFFFF',
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
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748B',
  },
  modalBody: {
    padding: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
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
    backgroundColor: '#F1F5F9',
  },
  submitModalButton: {
    backgroundColor: '#4a55e1',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  submitModalButtonText: {
    color: '#FFFFFF',
  },
});

export default ProposalsView;








