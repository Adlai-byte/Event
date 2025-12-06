import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Linking,
  Animated
} from 'react-native';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
const sidebarWidth = 260;

interface HiringViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface JobPosting {
  id: number;
  jobTitle: string;
  description: string;
  deadlineDate: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  updatedAt: string;
}

interface JobApplication {
  id: number;
  jobPostingId: number;
  userEmail: string;
  resumeFileName: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  interviewDate: string | null;
  interviewTime: string | null;
  rejectionNote: string | null;
  appliedAt: string;
  jobTitle: string;
  applicantFirstName: string | null;
  applicantLastName: string | null;
  applicantEmail: string;
}

export const HiringView: React.FC<HiringViewProps> = ({ user, onNavigate, onLogout }) => {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState('hiring');
  const [activeTab, setActiveTab] = useState<'postings' | 'applications'>('postings');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Form states
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [postJobError, setPostJobError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const errorToastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.email) {
      loadJobPostings();
      loadApplications();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'applications' && user?.email) {
      loadApplications();
    }
  }, [activeTab, user]);

  // Reset toast when modal closes
  useEffect(() => {
    if (!showPostModal) {
      setShowSuccessToast(false);
      setShowErrorToast(false);
      toastOpacity.setValue(0);
      errorToastOpacity.setValue(0);
      setErrorToastMessage('');
    }
  }, [showPostModal]);

  const loadJobPostings = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-postings?providerEmail=${encodeURIComponent(user.email)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setJobPostings(data.jobPostings || []);
        }
      }
    } catch (error) {
      console.error('Failed to load job postings:', error);
      Alert.alert('Error', 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-applications?providerEmail=${encodeURIComponent(user.email)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setApplications(data.applications || []);
        }
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    }
  };

  const handlePostJob = async () => {
    if (!user?.email) return;
    
    // Validation
    if (!jobTitle.trim() || !description.trim() || !deadlineDate) {
      const errorMsg = 'Please fill in all required fields';
      setPostJobError(errorMsg);
      displayErrorToast(errorMsg);
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(deadlineDate)) {
      const errorMsg = 'Please enter a valid date in YYYY-MM-DD format';
      setPostJobError(errorMsg);
      displayErrorToast(errorMsg);
      return;
    }

    // Validate date is in the future
    const selectedDate = new Date(deadlineDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate <= today) {
      const errorMsg = 'Deadline date must be in the future';
      setPostJobError(errorMsg);
      displayErrorToast(errorMsg);
      return;
    }

    setIsPostingJob(true);
    setPostJobError(null);

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response;
      try {
        response = await fetch(`${getApiBaseUrl()}/api/provider/job-postings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: user.email,
            jobTitle: jobTitle.trim(),
            description: description.trim(),
            deadlineDate: deadlineDate
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        // Handle HTTP errors
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `Server error (${response.status})` };
        }

        const errorMsg = errorData.error || `Request failed with status ${response.status}`;
        setPostJobError(errorMsg);
        displayErrorToast(errorMsg);
        setIsPostingJob(false);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        const errorMsg = 'Invalid response from server. Please try again.';
        setPostJobError(errorMsg);
        displayErrorToast(errorMsg);
        setIsPostingJob(false);
        return;
      }
      
      if (data.ok) {
        // Reset loading state immediately
        setIsPostingJob(false);
        
        // Show success toast
        setShowSuccessToast(true);
        Animated.sequence([
          Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowSuccessToast(false);
          setShowPostModal(false);
          resetForm();
          setPostJobError(null);
          loadJobPostings();
        });
      } else {
        let errorMsg = 'Failed to create job posting. Please try again.';
        
        if (data.error) {
          if (data.error.includes('deadline') || data.error.includes('date')) {
            errorMsg = 'Please enter a valid deadline date in the future.';
          } else if (data.error.includes('required')) {
            errorMsg = 'Please fill in all required fields.';
          } else {
            errorMsg = data.error;
          }
        }
        
        setPostJobError(errorMsg);
        displayErrorToast(errorMsg);
        setIsPostingJob(false);
      }
    } catch (error: any) {
      console.error('Failed to create job posting:', error);
      
      let errorMsg = 'Failed to create job posting. Please check your internet connection and try again.';
      
      if (error.message) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMsg = 'Request timed out. Please try again.';
        }
      }
      
      setPostJobError(errorMsg);
      displayErrorToast(errorMsg);
      setIsPostingJob(false);
    }
  };

  const displayErrorToast = (message: string) => {
    setErrorToastMessage(message);
    setShowErrorToast(true);
    errorToastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(errorToastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000), // Show for 3 seconds (longer than success)
      Animated.timing(errorToastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowErrorToast(false);
      setErrorToastMessage('');
    });
  };

  const handleEditJob = (job: JobPosting) => {
    setEditingJob(job);
    setJobTitle(job.jobTitle);
    setDescription(job.description);
    setDeadlineDate(job.deadlineDate);
    setShowEditModal(true);
  };

  const handleUpdateJob = async () => {
    if (!user?.email || !editingJob) return;
    
    if (!jobTitle.trim() || !description.trim() || !deadlineDate) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-postings/${editingJob.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: user.email,
            jobTitle: jobTitle.trim(),
            description: description.trim(),
            deadlineDate: deadlineDate
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        Alert.alert('Success', 'Job posting updated successfully');
        setShowEditModal(false);
        setEditingJob(null);
        resetForm();
        loadJobPostings();
      } else {
        Alert.alert('Error', data.error || 'Failed to update job posting');
      }
    } catch (error) {
      console.error('Failed to update job posting:', error);
      Alert.alert('Error', 'Failed to update job posting');
    }
  };

  const handleDeleteJob = (jobId: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this job posting?');
      if (confirmed) {
        deleteJob(jobId);
      }
    } else {
      Alert.alert(
        'Delete Job Posting',
        'Are you sure you want to delete this job posting?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => deleteJob(jobId)
          }
        ]
      );
    }
  };

  const deleteJob = async (jobId: number) => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-postings/${jobId}?providerEmail=${encodeURIComponent(user.email)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (data.ok) {
        Alert.alert('Success', 'Job posting deleted successfully');
        loadJobPostings();
      } else {
        Alert.alert('Error', data.error || 'Failed to delete job posting');
      }
    } catch (error) {
      console.error('Failed to delete job posting:', error);
      Alert.alert('Error', 'Failed to delete job posting');
    }
  };

  const handleToggleStatus = async (job: JobPosting) => {
    if (!user?.email) return;
    
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-postings/${job.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: user.email,
            status: newStatus
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        loadJobPostings();
      } else {
        Alert.alert('Error', data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const resetForm = () => {
    setJobTitle('');
    setDescription('');
    setDeadlineDate('');
    setEditingJob(null);
  };

  const handleScheduleInterview = (application: JobApplication) => {
    setSelectedApplication(application);
    if (application.interviewDate && application.interviewTime) {
      setInterviewDate(application.interviewDate);
      setInterviewTime(application.interviewTime);
    } else {
      setInterviewDate('');
      setInterviewTime('');
    }
    setShowInterviewModal(true);
  };

  const handleSubmitInterview = async () => {
    if (!user?.email || !selectedApplication) return;
    
    if (!interviewDate || !interviewTime) {
      Alert.alert('Validation Error', 'Please select both date and time for the interview');
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-applications/${selectedApplication.id}/schedule-interview`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: user.email,
            interviewDate: interviewDate,
            interviewTime: interviewTime
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        Alert.alert('Success', 'Interview scheduled successfully');
        setShowInterviewModal(false);
        setSelectedApplication(null);
        setInterviewDate('');
        setInterviewTime('');
        loadApplications();
      } else {
        Alert.alert('Error', data.error || 'Failed to schedule interview');
      }
    } catch (error) {
      console.error('Failed to schedule interview:', error);
      Alert.alert('Error', 'Failed to schedule interview');
    }
  };

  const handleRejectApplication = (application: JobApplication) => {
    setSelectedApplication(application);
    setRejectionNote('');
    setShowRejectModal(true);
  };

  const handleSubmitRejection = async () => {
    if (!user?.email || !selectedApplication) return;
    
    if (!rejectionNote.trim()) {
      Alert.alert('Validation Error', 'Please provide a rejection note');
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-applications/${selectedApplication.id}/reject`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: user.email,
            rejectionNote: rejectionNote.trim()
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        Alert.alert('Success', 'Application rejected successfully');
        setShowRejectModal(false);
        setSelectedApplication(null);
        setRejectionNote('');
        loadApplications();
      } else {
        Alert.alert('Error', data.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Failed to reject application:', error);
      Alert.alert('Error', 'Failed to reject application');
    }
  };

  const handleDownloadResume = async (applicationId: number) => {
    if (!user?.email) return;
    
    try {
      const url = `${getApiBaseUrl()}/api/provider/job-applications/${applicationId}/resume?providerEmail=${encodeURIComponent(user.email)}`;
      
      if (Platform.OS === 'web') {
        const response = await fetch(url);
        
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `resume_${applicationId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);
        } else {
          Alert.alert('Error', 'Failed to download resume');
        }
      } else {
        // Mobile: Open in browser
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to download resume:', error);
      Alert.alert('Error', 'Failed to download resume');
    }
  };

  const filteredJobPostings = jobPostings.filter(job => {
    if (filterStatus === 'all') return true;
    return job.status === filterStatus;
  });

  const statusFilters = ['all', 'active', 'closed', 'expired'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'closed': return '#64748b';
      case 'expired': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'reviewed': return '#3b82f6';
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#64748b';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const SidebarItem = ({ icon, label, route, onPress }: { icon: string; label: string; route: string; onPress?: () => void }) => {
    const isActive = activeRoute === route;
    return (
      <TouchableOpacity
        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
        onPress={() => {
          onPress?.();
          setActiveRoute(route);
          onNavigate?.(route);
        }}
      >
        <Text style={styles.sidebarIcon}>{icon}</Text>
        <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const SidebarContent = () => (
    <View style={styles.sidebar}>
      <View style={styles.profileCard}>
        {isMobile && (
          <TouchableOpacity 
            style={styles.closeSidebarButton}
            onPress={() => setSidebarVisible(false)}
          >
            <Text style={styles.closeSidebarIcon}>✕</Text>
          </TouchableOpacity>
        )}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.getInitials() || 'PR'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.getFullName() || 'Provider'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>
      </View>

      <View style={styles.sidebarNav}>
        <SidebarItem icon="🏠" label="Dashboard" route="dashboard" onPress={() => setSidebarVisible(false)} />
        <SidebarItem icon="🎯" label="Services" route="services" onPress={() => setSidebarVisible(false)} />
        <SidebarItem icon="📅" label="Bookings" route="bookings" onPress={() => setSidebarVisible(false)} />
        <SidebarItem icon="💼" label="Hiring" route="hiring" onPress={() => setSidebarVisible(false)} />
        <SidebarItem icon="💬" label="Messages" route="messages" onPress={() => setSidebarVisible(false)} />
        <SidebarItem icon="👤" label="Profile" route="profile" onPress={() => setSidebarVisible(false)} />
        <SidebarItem icon="⚙️" label="Settings" route="settings" onPress={() => setSidebarVisible(false)} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.layout}>
      {/* Sidebar - Desktop always visible, Mobile in modal */}
      {isMobile ? (
        <Modal
          visible={sidebarVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSidebarVisible(false)}
        >
          <View style={styles.sidebarOverlay}>
            <View style={styles.mobileSidebar}>
              <SidebarContent />
            </View>
          </View>
        </Modal>
      ) : (
        <SidebarContent />
      )}

      {/* Main Content */}
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isMobile && (
              <TouchableOpacity
                style={styles.mobileMenuButton}
                onPress={() => setSidebarVisible(true)}
              >
                <Text style={styles.mobileMenuIcon}>≡</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Job Postings</Text>
              <Text style={styles.headerSubtitle}>Post and manage job openings</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => {
              resetForm();
              setShowPostModal(true);
            }}
          >
            <Text style={styles.postButtonText}>+ Post Job</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'postings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('postings')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'postings' && styles.tabButtonTextActive]}>
              Job Postings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'applications' && styles.tabButtonActive]}
            onPress={() => setActiveTab('applications')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'applications' && styles.tabButtonTextActive]}>
              Applications ({applications.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Filters - Only show for Job Postings */}
        {activeTab === 'postings' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {statusFilters.map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {loading && activeTab === 'postings' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading job postings...</Text>
          </View>
        ) : activeTab === 'postings' ? (
          <>
            {filteredJobPostings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💼</Text>
                <Text style={styles.emptyStateText}>No job postings found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {filterStatus === 'all' 
                    ? 'You don\'t have any job postings yet' 
                    : `No ${filterStatus} job postings`}
                </Text>
              </View>
            ) : (
              isMobile ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={styles.tableScrollContainer}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Job Title</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Description</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Deadline</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actions</Text>
                    </View>

                    {/* Table Rows */}
                    {filteredJobPostings.map((job) => (
                      <View key={job.id} style={styles.tableRow}>
                        <View style={[styles.tableCell, { flex: 2 }]}>
                          <Text style={styles.tableCellTitle}>{job.jobTitle}</Text>
                        </View>
                        <View style={[styles.tableCell, { flex: 2.5 }]}>
                          <Text style={styles.tableCellText} numberOfLines={3}>{job.description}</Text>
                        </View>
                        <View style={[styles.tableCell, { flex: 1.2 }]}>
                          <Text style={styles.tableCellText}>{formatDate(job.deadlineDate)}</Text>
                        </View>
                        <View style={[styles.tableCell, { flex: 0.8 }]}>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                              {job.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, styles.tableCellActions, { flex: 2 }]}>
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.editButton]}
                            onPress={() => handleEditJob(job)}
                          >
                            <Text style={styles.tableActionButtonText}>✏️ Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.deleteButton]}
                            onPress={() => handleDeleteJob(job.id)}
                          >
                            <Text style={styles.tableActionButtonText}>🗑️ Delete</Text>
                          </TouchableOpacity>
                          {job.status !== 'expired' && (
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.toggleButton]}
                              onPress={() => handleToggleStatus(job)}
                            >
                              <Text style={styles.tableActionButtonText}>
                                {job.status === 'active' ? '🔒 Close' : '🔓 Reopen'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Job Title</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Description</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Deadline</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {filteredJobPostings.map((job) => (
                    <View key={job.id} style={styles.tableRow}>
                      <View style={[styles.tableCell, { flex: 2 }]}>
                        <Text style={styles.tableCellTitle}>{job.jobTitle}</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 2.5 }]}>
                        <Text style={styles.tableCellText} numberOfLines={3}>{job.description}</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1.2 }]}>
                        <Text style={styles.tableCellText}>{formatDate(job.deadlineDate)}</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 0.8 }]}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                            {job.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellActions, { flex: 2 }]}>
                        <TouchableOpacity
                          style={[styles.tableActionButton, styles.editButton]}
                          onPress={() => handleEditJob(job)}
                        >
                          <Text style={styles.tableActionButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tableActionButton, styles.deleteButton]}
                          onPress={() => handleDeleteJob(job.id)}
                        >
                          <Text style={styles.tableActionButtonText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                        {job.status !== 'expired' && (
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.toggleButton]}
                            onPress={() => handleToggleStatus(job)}
                          >
                            <Text style={styles.tableActionButtonText}>
                              {job.status === 'active' ? '🔒 Close' : '🔓 Reopen'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}
          </>
        ) : (
          // Applications View
          <>
            {applications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateText}>No applications yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Applications will appear here when users apply to your job postings
                </Text>
              </View>
            ) : (
              isMobile ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={styles.tableScrollContainer}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Job Title</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Applicant</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Applied</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Interview</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actions</Text>
                    </View>

                    {/* Table Rows */}
                    {applications.map((app) => (
                      <View key={app.id} style={styles.tableRow}>
                        <View style={[styles.tableCell, { flex: 1.5 }]}>
                          <Text style={styles.tableCellTitle}>{app.jobTitle}</Text>
                        </View>
                        <View style={[styles.tableCell, { flex: 1.5 }]}>
                          <Text style={styles.tableCellText}>
                            {app.applicantFirstName && app.applicantLastName 
                              ? `${app.applicantFirstName} ${app.applicantLastName}`
                              : app.applicantEmail}
                          </Text>
                          <Text style={[styles.tableCellText, { fontSize: 12, color: '#94A3B8' }]}>
                            {app.applicantEmail}
                          </Text>
                        </View>
                        <View style={[styles.tableCell, { flex: 1 }]}>
                          <Text style={styles.tableCellText}>{formatDate(app.appliedAt)}</Text>
                        </View>
                        <View style={[styles.tableCell, { flex: 1 }]}>
                          <View style={[styles.statusBadge, { backgroundColor: getApplicationStatusColor(app.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getApplicationStatusColor(app.status) }]}>
                              {app.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.tableCell, { flex: 1.2 }]}>
                          {app.interviewDate && app.interviewTime ? (
                            <Text style={styles.tableCellText} numberOfLines={2}>
                              {formatDate(app.interviewDate)}{'\n'}
                              {app.interviewTime}
                            </Text>
                          ) : (
                            <Text style={[styles.tableCellText, { color: '#94A3B8' }]}>Not scheduled</Text>
                          )}
                        </View>
                        <View style={[styles.tableCell, styles.tableCellActions, { flex: 2 }]}>
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.downloadButton]}
                            onPress={() => handleDownloadResume(app.id)}
                          >
                            <Text style={styles.tableActionButtonText}>📄 Resume</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.scheduleButton]}
                            onPress={() => handleScheduleInterview(app)}
                          >
                            <Text style={styles.tableActionButtonText}>
                              {app.interviewDate ? '✏️ Reschedule' : '📅 Schedule'}
                            </Text>
                          </TouchableOpacity>
                          {app.status !== 'rejected' && (
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.rejectButton]}
                              onPress={() => handleRejectApplication(app)}
                            >
                              <Text style={styles.tableActionButtonText}>❌ Reject</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Job Title</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Applicant</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Applied</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Interview</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {applications.map((app) => (
                    <View key={app.id} style={styles.tableRow}>
                      <View style={[styles.tableCell, { flex: 1.5 }]}>
                        <Text style={styles.tableCellTitle}>{app.jobTitle}</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1.5 }]}>
                        <Text style={styles.tableCellText}>
                          {app.applicantFirstName && app.applicantLastName 
                            ? `${app.applicantFirstName} ${app.applicantLastName}`
                            : app.applicantEmail}
                        </Text>
                        <Text style={[styles.tableCellText, { fontSize: 12, color: '#94A3B8' }]}>
                          {app.applicantEmail}
                        </Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <Text style={styles.tableCellText}>{formatDate(app.appliedAt)}</Text>
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        <View style={[styles.statusBadge, { backgroundColor: getApplicationStatusColor(app.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getApplicationStatusColor(app.status) }]}>
                            {app.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.tableCell, { flex: 1.2 }]}>
                        {app.interviewDate && app.interviewTime ? (
                          <Text style={styles.tableCellText} numberOfLines={2}>
                            {formatDate(app.interviewDate)}{'\n'}
                            {app.interviewTime}
                          </Text>
                        ) : (
                          <Text style={[styles.tableCellText, { color: '#94A3B8' }]}>Not scheduled</Text>
                        )}
                      </View>
                      <View style={[styles.tableCell, styles.tableCellActions, { flex: 2 }]}>
                        <TouchableOpacity
                          style={[styles.tableActionButton, styles.downloadButton]}
                          onPress={() => handleDownloadResume(app.id)}
                        >
                          <Text style={styles.tableActionButtonText}>📄 Resume</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tableActionButton, styles.scheduleButton]}
                          onPress={() => handleScheduleInterview(app)}
                        >
                          <Text style={styles.tableActionButtonText}>
                            {app.interviewDate ? '✏️ Reschedule' : '📅 Schedule'}
                          </Text>
                        </TouchableOpacity>
                        {app.status !== 'rejected' && (
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.rejectButton]}
                            onPress={() => handleRejectApplication(app)}
                          >
                            <Text style={styles.tableActionButtonText}>❌ Reject</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Post Job Modal */}
      <Modal
        visible={showPostModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPostModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          {/* Success Toast Notification */}
          {showSuccessToast && (
            <Animated.View
              style={[
                styles.successToast,
                {
                  opacity: toastOpacity,
                  transform: [
                    {
                      translateY: toastOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.successToastContent}>
                <Text style={styles.successToastIcon}>✓</Text>
                <Text style={styles.successToastText}>Successfully Added</Text>
              </View>
            </Animated.View>
          )}

          {/* Error Toast Notification */}
          {showErrorToast && (
            <Animated.View
              style={[
                styles.errorToast,
                {
                  opacity: errorToastOpacity,
                  transform: [
                    {
                      translateY: errorToastOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.errorToastContent}>
                <Text style={styles.errorToastIcon}>⚠</Text>
                <Text style={styles.errorToastText}>{errorToastMessage}</Text>
              </View>
            </Animated.View>
          )}

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post New Job</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowPostModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Job Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter job title"
                  value={jobTitle}
                  onChangeText={(text) => {
                    setJobTitle(text);
                    setPostJobError(null);
                  }}
                  maxLength={200}
                  editable={!isPostingJob}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter job description"
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    setPostJobError(null);
                  }}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!isPostingJob}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Deadline Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={deadlineDate}
                  onChangeText={(text) => {
                    setDeadlineDate(text);
                    setPostJobError(null);
                  }}
                  editable={!isPostingJob}
                />
                <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2025-12-31)</Text>
              </View>
              
              {/* Error Message Display */}
              {postJobError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{postJobError}</Text>
                  <TouchableOpacity
                    onPress={() => setPostJobError(null)}
                    style={styles.errorCloseButton}
                  >
                    <Text style={styles.errorCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPostModal(false);
                  resetForm();
                }}
                disabled={isPostingJob}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, (isPostingJob || !jobTitle.trim() || !description.trim() || !deadlineDate) && styles.submitButtonDisabled]}
                onPress={handlePostJob}
                disabled={isPostingJob || !jobTitle.trim() || !description.trim() || !deadlineDate}
              >
                {isPostingJob ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Posting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Post Job</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Job Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Job Posting</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Job Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter job title"
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  maxLength={200}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter job description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Deadline Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={deadlineDate}
                  onChangeText={setDeadlineDate}
                />
                <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2025-12-31)</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleUpdateJob}
              >
                <Text style={styles.submitButtonText}>Update Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        visible={showInterviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowInterviewModal(false);
          setSelectedApplication(null);
          setInterviewDate('');
          setInterviewTime('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedApplication?.interviewDate ? 'Reschedule Interview' : 'Schedule Interview'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowInterviewModal(false);
                  setSelectedApplication(null);
                  setInterviewDate('');
                  setInterviewTime('');
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <View style={styles.jobInfoContainer}>
                <Text style={styles.jobInfoTitle}>{selectedApplication.jobTitle}</Text>
                <Text style={styles.jobInfoDescription}>
                  Applicant: {selectedApplication.applicantFirstName && selectedApplication.applicantLastName 
                    ? `${selectedApplication.applicantFirstName} ${selectedApplication.applicantLastName}`
                    : selectedApplication.applicantEmail}
                </Text>
                {selectedApplication.interviewDate && selectedApplication.interviewTime && (
                  <Text style={styles.jobInfoDeadline}>
                    Current Interview: {formatDate(selectedApplication.interviewDate)} at {selectedApplication.interviewTime}
                  </Text>
                )}
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Interview Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={interviewDate}
                  onChangeText={setInterviewDate}
                />
                <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2025-12-15)</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Interview Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM (24-hour format)"
                  value={interviewTime}
                  onChangeText={setInterviewTime}
                />
                <Text style={styles.helperText}>Format: HH:MM (e.g., 14:30 for 2:30 PM)</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowInterviewModal(false);
                  setSelectedApplication(null);
                  setInterviewDate('');
                  setInterviewTime('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitInterview}
              >
                <Text style={styles.submitButtonText}>
                  {selectedApplication?.interviewDate ? 'Reschedule' : 'Schedule Interview'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Application Modal */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowRejectModal(false);
          setSelectedApplication(null);
          setRejectionNote('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Application</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedApplication(null);
                  setRejectionNote('');
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <View style={styles.jobInfoContainer}>
                <Text style={styles.jobInfoTitle}>{selectedApplication.jobTitle}</Text>
                <Text style={styles.jobInfoDescription}>
                  Applicant: {selectedApplication.applicantFirstName && selectedApplication.applicantLastName 
                    ? `${selectedApplication.applicantFirstName} ${selectedApplication.applicantLastName}`
                    : selectedApplication.applicantEmail}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Rejection Note *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Please provide a reason for rejection..."
                  value={rejectionNote}
                  onChangeText={setRejectionNote}
                  multiline={true}
                  numberOfLines={5}
                  maxLength={500}
                />
                <Text style={styles.helperText}>
                  {rejectionNote.length}/500 characters
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedApplication(null);
                  setRejectionNote('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButtonModal]}
                onPress={handleSubmitRejection}
              >
                <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Reject Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: isMobile ? 'column' : 'row',
    backgroundColor: '#F8FAFC',
  },
  sidebar: {
    width: sidebarWidth,
    backgroundColor: '#1F3B57',
    padding: 20,
    height: '100%',
  },
  profileCard: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D4A6B',
    marginBottom: 20,
  },
  closeSidebarButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
  },
  closeSidebarIcon: {
    fontSize: 24,
    color: '#fff',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a55e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  sidebarItemActive: {
    backgroundColor: '#4a55e1',
  },
  sidebarIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  sidebarLabel: {
    color: '#9FB3C8',
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#2D4A6B',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
  },
  content: {
    padding: isMobile ? 12 : 20,
    paddingTop: isMobile ? 60 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isMobile ? 16 : 24,
    paddingHorizontal: isMobile ? 0 : 0,
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: isMobile ? 24 : 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: isMobile ? 14 : 16,
    color: '#64748B',
  },
  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mobileMenuIcon: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: 'bold',
  },
  postButton: {
    backgroundColor: '#4a55e1',
    paddingVertical: isMobile ? 10 : 12,
    paddingHorizontal: isMobile ? 16 : 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 'auto',
  },
  postButtonText: {
    color: '#fff',
    fontSize: isMobile ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: isMobile ? 12 : 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    gap: 16,
  },
  tabButton: {
    paddingVertical: isMobile ? 10 : 12,
    paddingHorizontal: isMobile ? 16 : 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabButtonActive: {
    backgroundColor: '#4a55e1',
    borderWidth: 1,
    borderColor: '#1E293B',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  tabButtonText: {
    fontSize: isMobile ? 14 : 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: isMobile ? 14 : 15,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  tableScrollContainer: {
    marginTop: 16,
    ...(isMobile && {
      maxHeight: '100%',
    }),
  },
  tableScrollContent: {
    ...(isMobile && {
      minWidth: 900, // Minimum width to ensure all columns are visible
    }),
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: isMobile ? 900 : '100%', // Fixed width on mobile for horizontal scroll, full width on web
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  tableCellTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  tableCellText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableCellActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tableActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  editButton: {
    backgroundColor: '#DBEAFE',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  toggleButton: {
    backgroundColor: '#DBEAFE',
  },
  downloadButton: {
    backgroundColor: '#E0F2FE',
  },
  scheduleButton: {
    backgroundColor: '#D1FAE5',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  tableActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  mobileSidebar: {
    width: sidebarWidth,
    height: '100%',
    backgroundColor: '#1F3B57',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 600,
    maxHeight: Platform.OS === 'web' ? '90%' : '100%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)',
    } : {}),
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
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748B',
  },
  jobInfoContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  jobInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  jobInfoDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  jobInfoDeadline: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4a55e1',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#95A5A6',
    opacity: 0.6,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 14,
    lineHeight: 20,
  },
  errorCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorCloseText: {
    color: '#991B1B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rejectButtonModal: {
    backgroundColor: '#EF4444',
  },
  successToast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 40 : 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  successToastContent: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  successToastIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 12,
  },
  successToastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorToast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 40 : 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  errorToastContent: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  errorToastIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 12,
  },
  errorToastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
});

