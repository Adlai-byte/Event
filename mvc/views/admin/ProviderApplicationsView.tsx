import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { SkeletonListItem } from '../../components/ui';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { ApplicationDetailsModal } from '../../components/admin/ApplicationDetailsModal';
import { styles, getResponsiveStyles } from './ProviderApplicationsView.styles';

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
  const { isMobile, screenWidth } = useBreakpoints();
  const responsiveStyles = useMemo(() => getResponsiveStyles(isMobile, screenWidth), [isMobile, screenWidth]);

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
      <ScrollView style={styles.container} contentContainerStyle={responsiveStyles.content}>
        <View style={responsiveStyles.header}>
          <Text style={responsiveStyles.title}>Provider Applications</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search applications"
          />
        </View>

        {/* Filter Tabs */}
        <View style={responsiveStyles.filterContainer}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[responsiveStyles.filterTab, filterStatus === status && styles.filterTabActive]}
              onPress={() => setFilterStatus(status)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${status}`}
            >
              <Text style={[responsiveStyles.filterTabText, filterStatus === status && styles.filterTabTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
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
          <View style={responsiveStyles.tableContainer}>
            {/* Table Header */}
            <View style={responsiveStyles.tableHeader}>
              <Text style={[responsiveStyles.tableHeaderText, responsiveStyles.tableColName]}>Name</Text>
              <Text style={[responsiveStyles.tableHeaderText, responsiveStyles.tableColEmail]}>Email</Text>
              <Text style={[responsiveStyles.tableHeaderText, responsiveStyles.tableColStatus]}>Status</Text>
              <Text style={[responsiveStyles.tableHeaderText, responsiveStyles.tableColDate]}>Applied Date</Text>
              <Text style={[responsiveStyles.tableHeaderText, responsiveStyles.tableColActions]}>Actions</Text>
            </View>

            {/* Table Rows */}
            {filteredApplications.map((app, i) => (
              <View key={app.id} style={[responsiveStyles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <View style={responsiveStyles.tableColName}>
                  <Text style={responsiveStyles.tableCell}>{app.name}</Text>
                </View>
                <View style={responsiveStyles.tableColEmail}>
                  <Text style={responsiveStyles.tableCell} numberOfLines={1}>{app.email}</Text>
                </View>
                <View style={responsiveStyles.tableColStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(app.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(app.status) }]}>
                      {getStatusLabel(app.status)}
                    </Text>
                  </View>
                </View>
                <View style={responsiveStyles.tableColDate}>
                  <Text style={responsiveStyles.tableCell}>
                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }) : 'N/A'}
                  </Text>
                </View>
                <View style={responsiveStyles.tableColActions}>
                  <View style={styles.actionButtons}>
                    {(app.businessDocument || app.validIdDocument) && (
                      <TouchableOpacity
                        style={[responsiveStyles.actionButton, styles.viewDocumentsButton]}
                        onPress={() => {
                          setSelectedApplication(app);
                          setShowDocumentModal(true);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`View documents for ${app.name}`}
                      >
                        <Text style={responsiveStyles.viewDocumentsButtonText}>View Docs</Text>
                      </TouchableOpacity>
                    )}
                    {app.status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[
                            responsiveStyles.actionButton,
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
                          accessibilityRole="button"
                          accessibilityLabel={`Approve ${app.name}`}
                        >
                          <Text style={responsiveStyles.approveButtonText}>
                            {processingId === app.id ? 'Processing...' : 'Approve'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            responsiveStyles.actionButton,
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
                          accessibilityRole="button"
                          accessibilityLabel={`Reject ${app.name}`}
                        >
                          <Text style={responsiveStyles.rejectButtonText}>
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

        <ApplicationDetailsModal
          selectedApplication={selectedApplication}
          showDocumentModal={showDocumentModal}
          onCloseDocumentModal={() => setShowDocumentModal(false)}
          showApproveModal={showApproveModal}
          onCloseApproveModal={() => {
            setShowApproveModal(false);
            setApproveApplicationId(null);
          }}
          onConfirmApprove={handleConfirmApprove}
          showRejectModal={showRejectModal}
          onCloseRejectModal={() => {
            setShowRejectModal(false);
            setRejectApplicationId(null);
            setRejectionReason('');
          }}
          onConfirmReject={handleConfirmReject}
          rejectionReason={rejectionReason}
          onRejectionReasonChange={setRejectionReason}
          processingId={processingId}
          isMobile={isMobile}
          responsiveStyles={responsiveStyles}
        />
      </ScrollView>
    </AppLayout>
  );
};

export default ProviderApplicationsView;
