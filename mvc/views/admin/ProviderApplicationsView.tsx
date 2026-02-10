import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Modal, Image, Platform, TextInput } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface ProviderApplicationsProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface ProviderApplication {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  role: string;
  businessDocument?: string | null;
  validIdDocument?: string | null;
}

export const ProviderApplicationsView: React.FC<ProviderApplicationsProps> = ({ user, onNavigate, onLogout }) => {
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<ProviderApplication | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectApplicationId, setRejectApplicationId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveApplicationId, setApproveApplicationId] = useState<number | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/admin/provider-applications`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: ProviderApplication[] = data.rows.map((u: any) => ({
            id: u.iduser,
            name: [u.u_fname, u.u_lname].filter(Boolean).join(' ').trim() || 'Unknown',
            email: u.u_email,
            status: u.u_provider_status || (u.u_role === 'provider' ? 'approved' : 'pending'),
            appliedAt: u.applied_at || u.u_created_at || new Date().toISOString(),
            role: u.u_role || 'user',
            businessDocument: u.u_business_document || null,
            validIdDocument: u.u_valid_id_document || null
          }));
          setApplications(mapped);
        }
      }
    } catch (error) {
      console.error('Error loading provider applications:', error);
      Alert.alert('Error', 'Failed to load provider applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (applicationId: number) => {
    if (processingId === applicationId) return;
    setApproveApplicationId(applicationId);
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    const applicationId = approveApplicationId;
    if (applicationId == null) return;
    setProcessingId(applicationId);
    setShowApproveModal(false);
    setApproveApplicationId(null);
    try {
      const apiUrl = `${getApiBaseUrl()}/api/admin/provider-applications/${applicationId}/approve`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Provider application approved successfully!');
        } else {
          Alert.alert('Success', 'Provider application approved successfully!', [
            { text: 'OK', onPress: () => { setProcessingId(null); loadApplications(); } },
          ]);
        }
        setProcessingId(null);
        loadApplications();
      } else {
        setProcessingId(null);
        const errorMsg = data.error || 'Failed to approve application. Please try again.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Approve error:', error);
      setProcessingId(null);
      const errorMsg = 'An error occurred while approving the application. Please try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleReject = (applicationId: number) => {
    console.log('handleReject called with ID:', applicationId);
    // Prevent multiple clicks on the same application
    if (processingId === applicationId) {
      console.log('Already processing this application');
      return;
    }

    setRejectApplicationId(applicationId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectApplicationId) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
        return;
      }

    setProcessingId(rejectApplicationId);
    setShowRejectModal(false);

    try {
      const apiUrl = `${getApiBaseUrl()}/api/admin/provider-applications/${rejectApplicationId}/reject`;
      console.log('Calling API:', apiUrl);

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim()
        })
      });

      console.log('API Response status:', resp.status);
      const data = await resp.json();
      console.log('API Response data:', data);

      if (resp.ok && data.ok) {
        console.log('Rejection successful');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Provider application rejected. The user has been notified.');
        } else {
          Alert.alert('Success', 'Provider application rejected. The user has been notified.', [
            {
              text: 'OK',
              onPress: () => {
                console.log('Reloading applications...');
                setProcessingId(null);
                setRejectApplicationId(null);
                setRejectionReason('');
                loadApplications();
              }
            }
          ]);
        }
        setProcessingId(null);
        setRejectApplicationId(null);
        setRejectionReason('');
        loadApplications();
      } else {
        console.error('Rejection failed:', data.error);
        setProcessingId(null);
        setRejectApplicationId(null);
        const errorMsg = data.error || 'Failed to reject application. Please try again.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Reject error:', error);
      setProcessingId(null);
      setRejectApplicationId(null);
      const errorMsg = 'An error occurred while rejecting the application. Please try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <AppLayout
      role="admin"
      activeRoute="providerApplications"
      title="Applications"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Provider Applications</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, filterStatus === status && styles.filterTabActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterTabText, filterStatus === status && styles.filterTabTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading applications...</Text>
          </View>
        ) : filteredApplications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No provider applications found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filterStatus === 'all'
                ? 'No users have applied as providers yet'
                : `No ${filterStatus} applications`}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal={isMobile}
            showsHorizontalScrollIndicator={isMobile}
            style={isMobile ? styles.tableScrollView : undefined}
            contentContainerStyle={isMobile ? styles.tableScrollContent : undefined}
          >
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.tableColName]}>Name</Text>
              <Text style={[styles.tableHeaderText, styles.tableColEmail]}>Email</Text>
              <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
              <Text style={[styles.tableHeaderText, styles.tableColDate]}>Applied Date</Text>
              <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
            </View>

            {/* Table Rows */}
            {filteredApplications.map((app, i) => (
              <View key={app.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <View style={styles.tableColName}>
                  <Text style={styles.tableCell}>{app.name}</Text>
                </View>
                <View style={styles.tableColEmail}>
                  <Text style={styles.tableCell} numberOfLines={1}>{app.email}</Text>
                </View>
                <View style={styles.tableColStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(app.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(app.status) }]}>
                      {getStatusLabel(app.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.tableColDate}>
                  <Text style={styles.tableCell}>
                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.tableColActions}>
                  <View style={styles.actionButtons}>
                    {(app.businessDocument || app.validIdDocument) && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.viewDocumentsButton]}
                        onPress={() => {
                          setSelectedApplication(app);
                          setShowDocumentModal(true);
                        }}
                      >
                        <Text style={styles.viewDocumentsButtonText}>View Docs</Text>
                      </TouchableOpacity>
                    )}
                    {app.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.approveButton,
                            processingId === app.id && styles.actionButtonDisabled
                          ]}
                          onPress={() => {
                            console.log('Approve button pressed for ID:', app.id);
                            handleApprove(app.id);
                          }}
                          disabled={processingId === app.id}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={styles.approveButtonText}>
                            {processingId === app.id ? 'Processing...' : 'Approve'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.rejectButton,
                            processingId === app.id && styles.actionButtonDisabled
                          ]}
                          onPress={() => {
                            console.log('Reject button pressed for ID:', app.id);
                            handleReject(app.id);
                          }}
                          disabled={processingId === app.id}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text style={styles.rejectButtonText}>
                            {processingId === app.id ? 'Processing...' : 'Reject'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {app.status === 'approved' && (
                      <Text style={styles.approvedText}>✓ Approved</Text>
                    )}
                    {app.status === 'rejected' && (
                      <Text style={styles.rejectedText}>✗ Rejected</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
          </ScrollView>
        )}

        {/* Document View Modal */}
        <Modal
          visible={showDocumentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDocumentModal(false)}
        >
          <View style={styles.documentModalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Documents - {selectedApplication?.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDocumentModal(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Business Document */}
                {selectedApplication?.businessDocument && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentLabel}>Business/Company Documents</Text>
                    <Image
                      source={{ uri: `${getApiBaseUrl()}${selectedApplication.businessDocument}` }}
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Valid ID Document */}
                {selectedApplication?.validIdDocument && (
                  <View style={styles.documentSection}>
                    <Text style={styles.documentLabel}>Valid ID</Text>
                    <Image
                      source={{ uri: `${getApiBaseUrl()}${selectedApplication.validIdDocument}` }}
                      style={styles.documentImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {!selectedApplication?.businessDocument && !selectedApplication?.validIdDocument && (
                  <Text style={styles.noDocumentsText}>No documents available</Text>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowDocumentModal(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Approve Confirmation Modal */}
        <Modal
          visible={showApproveModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => {
            if (!processingId) {
              setShowApproveModal(false);
              setApproveApplicationId(null);
            }
          }}
        >
          <View style={styles.documentModalOverlay}>
            <View style={styles.approveModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Approve Provider Application</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!processingId) {
                      setShowApproveModal(false);
                      setApproveApplicationId(null);
                    }
                  }}
                  style={styles.closeButton}
                  disabled={!!processingId}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.approveModalBody}>
                <Text style={styles.approveModalDescription}>
                  Are you sure you want to approve this provider application? This will grant provider access to the user.
                </Text>
              </View>
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, processingId && styles.buttonDisabled]}
                  onPress={() => {
                    if (!processingId) {
                      setShowApproveModal(false);
                      setApproveApplicationId(null);
                    }
                  }}
                  disabled={!!processingId}
                >
                  <Text style={styles.cancelButtonText} allowFontScaling={true} numberOfLines={1}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveConfirmButton, processingId && styles.submitButtonDisabled]}
                  onPress={handleConfirmApprove}
                  disabled={!!processingId}
                  activeOpacity={0.7}
                >
                  {processingId ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.approveConfirmButtonText} allowFontScaling={true} numberOfLines={1}>Approve</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reject Application Modal */}
        <Modal
          visible={showRejectModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            if (!processingId) {
              setShowRejectModal(false);
              setRejectApplicationId(null);
              setRejectionReason('');
            }
          }}
        >
          <View style={styles.documentModalOverlay}>
            <View style={styles.rejectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reject Provider Application</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!processingId) {
                      setShowRejectModal(false);
                      setRejectApplicationId(null);
                      setRejectionReason('');
                    }
                  }}
                  style={styles.closeButton}
                  disabled={!!processingId}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rejectModalBody}>
                <Text style={styles.rejectModalDescription}>
                  Please provide a reason for rejecting this provider application. This reason will be sent to the user as a notification.
                </Text>

                <Text style={styles.rejectModalLabel}>Rejection Reason *</Text>
                <TextInput
                  style={styles.rejectReasonInput}
                  placeholder="Enter the reason for rejection..."
                  placeholderTextColor={isMobile ? "#64748B" : "#A4B0BE"}
                  multiline
                  numberOfLines={6}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  editable={!processingId}
                  textAlignVertical="top"
                />
                <Text style={styles.rejectModalNote}>
                  This message will be visible to the user in their notifications.
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, processingId && styles.buttonDisabled]}
                  onPress={() => {
                    if (!processingId) {
                      setShowRejectModal(false);
                      setRejectApplicationId(null);
                      setRejectionReason('');
                    }
                  }}
                  disabled={!!processingId}
                >
                  <Text style={styles.cancelButtonText} allowFontScaling={true} numberOfLines={1}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.rejectConfirmButton,
                    (!rejectionReason.trim() || processingId) && styles.submitButtonDisabled
                  ]}
                  onPress={handleConfirmReject}
                  disabled={!rejectionReason.trim() || !!processingId}
                  activeOpacity={0.7}
                >
                  {processingId ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.rejectConfirmButtonText} allowFontScaling={true} numberOfLines={1}>Confirm Rejection</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: isMobile ? 12 : 20,
  },
  header: {
    marginBottom: isMobile ? 16 : 24,
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: isMobile ? 12 : 20,
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: isMobile ? undefined : 1,
    minWidth: isMobile ? (screenWidth - 48) / 4 : undefined,
    paddingVertical: isMobile ? 6 : 8,
    paddingHorizontal: isMobile ? 8 : 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4a55e1',
  },
  filterTabText: {
    fontSize: isMobile ? 11 : 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterTabTextActive: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  tableScrollView: {
    marginTop: 8,
  },
  tableScrollContent: {
    minWidth: 800,
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    ...(isMobile && { minWidth: 800 }),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: isMobile ? 10 : 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: isMobile ? 10 : 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: isMobile ? 12 : 16,
    paddingHorizontal: isMobile ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: isMobile ? 12 : 14,
    color: '#1E293B',
  },
  tableColName: {
    flex: 1.5,
    minWidth: isMobile ? 120 : undefined,
    paddingRight: isMobile ? 8 : 0,
  },
  tableColEmail: {
    flex: 2,
    minWidth: isMobile ? 150 : undefined,
    paddingRight: isMobile ? 8 : 0,
  },
  tableColStatus: {
    flex: 1,
    minWidth: isMobile ? 100 : undefined,
    paddingRight: isMobile ? 8 : 0,
  },
  tableColDate: {
    flex: 1,
    minWidth: isMobile ? 100 : undefined,
    paddingRight: isMobile ? 8 : 0,
  },
  tableColActions: {
    flex: 1.5,
    minWidth: isMobile ? 200 : undefined,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: isMobile ? 6 : 6,
    paddingHorizontal: isMobile ? 10 : 12,
    borderRadius: 6,
    minWidth: isMobile ? 60 : 70,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 11 : 12,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 11 : 12,
    fontWeight: '600',
  },
  approvedText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectedText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  viewDocumentsButton: {
    backgroundColor: '#4a55e1',
    marginRight: 8,
  },
  viewDocumentsButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 11 : 12,
    fontWeight: '600',
  },
  documentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    maxHeight: screenWidth * 0.6,
  },
  documentSection: {
    marginBottom: 24,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  documentImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 40,
  },
  modalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  closeModalButton: {
    backgroundColor: '#4a55e1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  approveModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    margin: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  approveModalBody: {
    padding: 20,
  },
  approveModalDescription: {
    fontSize: isMobile ? 16 : 15,
    color: '#1E293B',
    lineHeight: isMobile ? 24 : 22,
  },
  approveConfirmButton: {
    flex: 1,
    minWidth: isMobile ? 120 : undefined,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: isMobile ? 18 : 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 17 : 16,
    fontWeight: '700',
    ...(Platform.OS === 'android' && {
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    }),
  },
  rejectModalBody: {
    padding: 20,
  },
  rejectModalDescription: {
    fontSize: isMobile ? 15 : 14,
    color: isMobile ? '#334155' : '#636E72',
    lineHeight: isMobile ? 22 : 20,
    marginBottom: 20,
  },
  rejectModalLabel: {
    fontSize: isMobile ? 15 : 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  rejectReasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: isMobile ? 16 : 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  rejectModalNote: {
    fontSize: isMobile ? 13 : 12,
    color: isMobile ? '#475569' : '#64748B',
    fontStyle: 'italic',
  },
  rejectConfirmButton: {
    flex: 1,
    minWidth: isMobile ? 140 : undefined,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: isMobile ? 18 : 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 17 : 16,
    fontWeight: '700',
    ...(Platform.OS === 'android' && {
      textShadowColor: 'rgba(0,0,0,0.2)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    flex: 1,
    minWidth: isMobile ? 120 : undefined,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: isMobile ? 18 : 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#1E293B',
    fontSize: isMobile ? 17 : 16,
    fontWeight: '700',
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
});

export default ProviderApplicationsView;
