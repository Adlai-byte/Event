import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Modal, Image, Platform } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');
const sidebarWidth = Math.min(220, screenWidth * 0.25);

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
  const [selectedApplication, setSelectedApplication] = useState<ProviderApplication | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

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
            appliedAt: u.u_created_at || new Date().toISOString(),
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

  const handleApprove = async (applicationId: number) => {
    console.log('handleApprove called with ID:', applicationId);
    // Prevent multiple clicks on the same application
    if (processingId === applicationId) {
      console.log('Already processing this application');
      return;
    }
    
    const confirmMessage = 'Are you sure you want to approve this provider application? This will grant provider access to the user.';
    
    // Use window.confirm for web, Alert.alert for mobile
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return;
      }
    } else {
      // For mobile, use Alert.alert with callback
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Approve Provider',
          confirmMessage,
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => {
                console.log('Approval cancelled');
                resolve();
              }
            },
            {
              text: 'Approve',
              onPress: async () => {
                confirmed = true;
                // Process approval
                setProcessingId(applicationId);
                try {
                  const apiUrl = `${getApiBaseUrl()}/api/admin/provider-applications/${applicationId}/approve`;
                  console.log('Calling API:', apiUrl);
                  
                  const resp = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  });
                  
                  console.log('API Response status:', resp.status);
                  const data = await resp.json();
                  console.log('API Response data:', data);
                  
                  if (resp.ok && data.ok) {
                    console.log('Approval successful');
                    Alert.alert('Success', 'Provider application approved successfully!', [
                      { 
                        text: 'OK', 
                        onPress: () => {
                          console.log('Reloading applications...');
                          setProcessingId(null);
                          loadApplications();
                          resolve();
                        }
                      }
                    ]);
                  } else {
                    console.error('Approval failed:', data.error);
                    setProcessingId(null);
                    Alert.alert('Error', data.error || 'Failed to approve application. Please try again.');
                    resolve();
                  }
                } catch (error) {
                  console.error('Approve error:', error);
                  setProcessingId(null);
                  Alert.alert('Error', 'An error occurred while approving the application. Please try again.');
                  resolve();
                }
              }
            }
          ]
        );
      });
    }
    
    console.log('Approval confirmed, processing...');
    setProcessingId(applicationId);
    try {
      const apiUrl = `${getApiBaseUrl()}/api/admin/provider-applications/${applicationId}/approve`;
      console.log('Calling API:', apiUrl);
      
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('API Response status:', resp.status);
      const data = await resp.json();
      console.log('API Response data:', data);
      
      if (resp.ok && data.ok) {
        console.log('Approval successful');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Provider application approved successfully!');
        } else {
          Alert.alert('Success', 'Provider application approved successfully!', [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('Reloading applications...');
                setProcessingId(null);
                loadApplications();
              }
            }
          ]);
        }
        setProcessingId(null);
        loadApplications();
      } else {
        console.error('Approval failed:', data.error);
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

  const handleReject = async (applicationId: number) => {
    console.log('handleReject called with ID:', applicationId);
    // Prevent multiple clicks on the same application
    if (processingId === applicationId) {
      console.log('Already processing this application');
      return;
    }
    
    const confirmMessage = 'Are you sure you want to reject this provider application? This action cannot be undone.';
    
    // Use window.confirm for web, Alert.alert for mobile
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return;
      }
    } else {
      // For mobile, use Alert.alert with callback
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Reject Provider',
          confirmMessage,
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => {
                console.log('Rejection cancelled');
                resolve();
              }
            },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async () => {
                confirmed = true;
                // Process rejection
                setProcessingId(applicationId);
                try {
                  const apiUrl = `${getApiBaseUrl()}/api/admin/provider-applications/${applicationId}/reject`;
                  console.log('Calling API:', apiUrl);
                  
                  const resp = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    }
                  });
                  
                  console.log('API Response status:', resp.status);
                  const data = await resp.json();
                  console.log('API Response data:', data);
                  
                  if (resp.ok && data.ok) {
                    console.log('Rejection successful');
                    Alert.alert('Success', 'Provider application rejected.', [
                      { 
                        text: 'OK', 
                        onPress: () => {
                          console.log('Reloading applications...');
                          setProcessingId(null);
                          loadApplications();
                          resolve();
                        }
                      }
                    ]);
                  } else {
                    console.error('Rejection failed:', data.error);
                    setProcessingId(null);
                    Alert.alert('Error', data.error || 'Failed to reject application. Please try again.');
                    resolve();
                  }
                } catch (error) {
                  console.error('Reject error:', error);
                  setProcessingId(null);
                  Alert.alert('Error', 'An error occurred while rejecting the application. Please try again.');
                  resolve();
                }
              }
            }
          ]
        );
      });
    }
    
    console.log('Rejection confirmed, processing...');
    setProcessingId(applicationId);
    try {
      const apiUrl = `${getApiBaseUrl()}/api/admin/provider-applications/${applicationId}/reject`;
      console.log('Calling API:', apiUrl);
      
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('API Response status:', resp.status);
      const data = await resp.json();
      console.log('API Response data:', data);
      
      if (resp.ok && data.ok) {
        console.log('Rejection successful');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Provider application rejected.');
        } else {
          Alert.alert('Success', 'Provider application rejected.', [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('Reloading applications...');
                setProcessingId(null);
                loadApplications();
              }
            }
          ]);
        }
        setProcessingId(null);
        loadApplications();
      } else {
        console.error('Rejection failed:', data.error);
        setProcessingId(null);
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
      const errorMsg = 'An error occurred while rejecting the application. Please try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const SidebarItem = ({ icon, label, route }: { icon: string; label: string; route: string }) => (
    <TouchableOpacity style={styles.sidebarItem} onPress={() => onNavigate?.(route)}>
      <Text style={styles.sidebarIcon}>{icon}</Text>
      <Text style={styles.sidebarLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const filteredApplications = applications.filter(app => 
    filterStatus === 'all' || app.status === filterStatus
  );

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
    <View style={styles.layout}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.getInitials() || 'AD'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.getFullName() || 'Admin'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.sidebarNav}>
          <SidebarItem icon="🏠" label="Dashboard" route="dashboard" />
          <SidebarItem icon="👤" label="Users" route="user" />
          <SidebarItem icon="🚀" label="Provider Applications" route="providerApplications" />
          <SidebarItem icon="📊" label="Analytics" route="analytics" />
          <SidebarItem icon="⚙️" label="Settings" route="settings" />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Provider Applications</Text>
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
                    {new Date(app.appliedAt).toLocaleDateString()}
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
        )}

        {/* Document View Modal */}
        <Modal
          visible={showDocumentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDocumentModal(false)}
        >
          <View style={styles.modalOverlay}>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
  },
  sidebar: {
    width: sidebarWidth,
    backgroundColor: '#102A43',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1F3B57',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  profileEmail: {
    color: '#9FB3C8',
    fontSize: 12,
    marginTop: 4,
  },
  sidebarNav: {
    marginTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarIcon: {
    width: 26,
    fontSize: 16,
    color: '#DFE7EF',
  },
  sidebarLabel: {
    color: '#DFE7EF',
    fontSize: 14,
    marginLeft: 6,
  },
  logoutButton: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1F3B57',
  },
  logoutIcon: {
    width: 26,
    fontSize: 16,
    color: '#FEE2E2',
  },
  logoutText: {
    color: '#FEE2E2',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#4a55e1',
  },
  filterTabText: {
    fontSize: 13,
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
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 14,
    color: '#1E293B',
  },
  tableColName: {
    flex: 1.5,
  },
  tableColEmail: {
    flex: 2,
  },
  tableColStatus: {
    flex: 1,
  },
  tableColDate: {
    flex: 1,
  },
  tableColActions: {
    flex: 1.5,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
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
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
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
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
});

export default ProviderApplicationsView;

