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
import { AppLayout } from '../../components/layout';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

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
  interviewDescription: string | null;
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
  const [activeTab, setActiveTab] = useState<'postings' | 'applications'>('postings');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Form states
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [jobType, setJobType] = useState<'full_time' | 'part_time'>('full_time');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewDescription, setInterviewDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDeadlineDatePicker, setShowDeadlineDatePicker] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [hireNote, setHireNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessTooltip, setShowSuccessTooltip] = useState(false);
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
            deadlineDate: deadlineDate,
            jobType: jobType
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
    setJobType('full_time');
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
    setInterviewDescription((application as any).interviewDescription || '');
    setShowInterviewModal(true);
  };

  const handleSubmitInterview = async () => {
    if (!user?.email || !selectedApplication) return;
    
    // Clear previous tooltips
    setErrorMessage(null);
    setShowErrorTooltip(false);
    setSuccessMessage(null);
    setShowSuccessTooltip(false);
    
    if (!interviewDate || !interviewTime || !interviewDescription.trim()) {
      const errorMsg = 'Please fill in all required fields: date, time, and description';
      if (Platform.OS === 'web') {
        setErrorMessage(errorMsg);
        setShowErrorTooltip(true);
        setTimeout(() => {
          setShowErrorTooltip(false);
        }, 5000);
      } else {
        Alert.alert('Validation Error', errorMsg);
      }
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
            interviewTime: interviewTime,
            interviewDescription: interviewDescription
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        const successMsg = selectedApplication?.interviewDate ? 'Interview rescheduled successfully' : 'Interview scheduled successfully';
        if (Platform.OS === 'web') {
          setSuccessMessage(successMsg);
          setShowSuccessTooltip(true);
          setTimeout(() => {
            setShowSuccessTooltip(false);
            setShowInterviewModal(false);
            setSelectedApplication(null);
            setInterviewDate('');
            setInterviewTime('');
            setInterviewDescription('');
            loadApplications();
          }, 2000);
        } else {
          Alert.alert('Success', successMsg);
          setShowInterviewModal(false);
          setSelectedApplication(null);
          setInterviewDate('');
          setInterviewTime('');
          loadApplications();
        }
      } else {
        const errorMsg = data.error || 'Failed to schedule interview';
        if (Platform.OS === 'web') {
          setErrorMessage(errorMsg);
          setShowErrorTooltip(true);
          setTimeout(() => {
            setShowErrorTooltip(false);
          }, 5000);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Failed to schedule interview:', error);
      const errorMsg = 'Failed to schedule interview. Please try again.';
      if (Platform.OS === 'web') {
        setErrorMessage(errorMsg);
        setShowErrorTooltip(true);
        setTimeout(() => {
          setShowErrorTooltip(false);
        }, 5000);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  // Check if interview time has passed
  const isInterviewTimePassed = (application: JobApplication): boolean => {
    if (!application.interviewDate || !application.interviewTime) {
      return false;
    }
    
    try {
      // Parse date (YYYY-MM-DD format)
      const dateStr = String(application.interviewDate).trim();
      const dateParts = dateStr.split('-');
      if (dateParts.length !== 3) {
        console.warn('Invalid date format:', dateStr);
        return false;
      }
      
      const interviewYear = parseInt(dateParts[0]);
      const interviewMonth = parseInt(dateParts[1]) - 1; // Month is 0-indexed
      const interviewDay = parseInt(dateParts[2]);
      
      // Parse time (HH:MM:SS or HH:MM format)
      const timeStr = String(application.interviewTime).trim();
      const timeParts = timeStr.split(':');
      
      if (timeParts.length < 2) {
        console.warn('Invalid time format:', timeStr);
        return false;
      }
      
      const interviewHour = parseInt(timeParts[0]);
      const interviewMinute = parseInt(timeParts[1]);
      const interviewSecond = timeParts.length > 2 ? parseInt(timeParts[2]) : 0;
      
      // Create interview date object using local time
      const interviewDateTime = new Date(
        interviewYear,
        interviewMonth,
        interviewDay,
        interviewHour,
        interviewMinute,
        interviewSecond
      );
      
      // Get current date/time
      const now = new Date();
      
      // Compare
      const hasPassed = interviewDateTime < now;
      
      // Debug logging (only on web or when needed)
      if (Platform.OS === 'web' || hasPassed) {
        console.log('Interview time check:', {
          interviewDate: application.interviewDate,
          interviewTime: application.interviewTime,
          interviewDateTime: interviewDateTime.toLocaleString(),
          now: now.toLocaleString(),
          hasPassed: hasPassed,
          interviewTimestamp: interviewDateTime.getTime(),
          nowTimestamp: now.getTime()
        });
      }
      
      return hasPassed;
    } catch (error) {
      console.error('Error checking interview time:', error, {
        interviewDate: application.interviewDate,
        interviewTime: application.interviewTime
      });
      return false;
    }
  };

  const handleHireApplication = (application: JobApplication) => {
    if (!user?.email) return;
    setSelectedApplication(application);
    setHireNote('');
    setShowHireModal(true);
  };

  const handleSubmitHire = async () => {
    if (!user?.email || !selectedApplication) return;
    
    if (!hireNote.trim()) {
      const errorMsg = 'Please provide a hiring note';
      if (Platform.OS === 'web') {
        setErrorMessage(errorMsg);
        setShowErrorTooltip(true);
        setTimeout(() => {
          setShowErrorTooltip(false);
          setErrorMessage(null);
        }, 5000);
      } else {
        Alert.alert('Validation Error', errorMsg);
      }
      return;
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/provider/job-applications/${selectedApplication.id}/accept`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerEmail: user.email,
            hireNote: hireNote.trim()
          })
        }
      );

      const data = await response.json();
      
      if (data.ok) {
        if (Platform.OS === 'web') {
          setSuccessMessage('Applicant hired successfully!');
          setShowSuccessTooltip(true);
          setTimeout(() => {
            setShowSuccessTooltip(false);
            setSuccessMessage(null);
            setShowHireModal(false);
            setSelectedApplication(null);
            setHireNote('');
            loadApplications();
          }, 2000);
        } else {
          Alert.alert('Success', 'Applicant hired successfully!');
          setShowHireModal(false);
          setSelectedApplication(null);
          setHireNote('');
          loadApplications();
        }
      } else {
        const errorMsg = data.error || 'Failed to hire applicant';
        if (Platform.OS === 'web') {
          setErrorMessage(errorMsg);
          setShowErrorTooltip(true);
          setTimeout(() => {
            setShowErrorTooltip(false);
            setErrorMessage(null);
          }, 5000);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (error) {
      console.error('Failed to hire applicant:', error);
      const errorMsg = 'Failed to hire applicant. Please try again.';
      if (Platform.OS === 'web') {
        setErrorMessage(errorMsg);
        setShowErrorTooltip(true);
        setTimeout(() => {
          setShowErrorTooltip(false);
          setErrorMessage(null);
        }, 5000);
      } else {
        Alert.alert('Error', errorMsg);
      }
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

  // Get current step index for progress bar (0 = Applied, 1 = Under Review, 2 = Accepted/Rejected)
  const getCurrentStep = (status: string): number => {
    switch (status) {
      case 'pending': return 0;
      case 'reviewed': return 1;
      case 'accepted': return 2;
      case 'rejected': return 2;
      default: return 0;
    }
  };

  // Render progress bar component
  const renderProgressBar = (status: string) => {
    // Progress bar removed - return null
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AppLayout
      role="provider"
      activeRoute="hiring"
      title="Hiring"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Job Postings</Text>
            <Text style={styles.headerSubtitle}>Post and manage job openings</Text>
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
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Job Type</Text>
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
                        <View style={[styles.tableCell, { flex: 1 }]}>
                          <Text style={styles.tableCellText}>
                            {((job as any).jobType === 'full_time' || !(job as any).jobType) ? 'Full Time' : 
                             (job as any).jobType === 'part_time' ? 'Part Time' : 
                             String((job as any).jobType || 'Full Time')}
                          </Text>
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
                            <View>
                              <Text style={styles.tableCellText} numberOfLines={1}>
                                {formatDate(app.interviewDate)}{'\n'}
                                {app.interviewTime}
                              </Text>
                              {(app as any).interviewDescription && (
                                <Text style={[styles.tableCellText, { fontSize: 11, color: '#64748B', marginTop: 4 }]} numberOfLines={2}>
                                  📝 {(app as any).interviewDescription}
                                </Text>
                              )}
                            </View>
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
                          {app.status !== 'accepted' && app.status !== 'rejected' && (
                            <>
                              <TouchableOpacity
                                style={[styles.tableActionButton, styles.scheduleButton]}
                                onPress={() => handleScheduleInterview(app)}
                              >
                                <Text style={styles.tableActionButtonText}>
                                  {app.interviewDate ? '✏️ Reschedule' : '📅 Schedule'}
                                </Text>
                              </TouchableOpacity>
                              {isInterviewTimePassed(app) && (
                                <TouchableOpacity
                                  style={[styles.tableActionButton, styles.hireButton]}
                                  onPress={() => handleHireApplication(app)}
                                >
                                  <Text style={styles.tableActionButtonText}>✅ Hire</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.tableActionButton, styles.rejectButton]}
                                onPress={() => handleRejectApplication(app)}
                              >
                                <Text style={styles.tableActionButtonText}>❌ Reject</Text>
                              </TouchableOpacity>
                            </>
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
                        {renderProgressBar(app.status)}
                      </View>
                        <View style={[styles.tableCell, { flex: 1.2 }]}>
                          {app.interviewDate && app.interviewTime ? (
                            <View>
                              <Text style={styles.tableCellText} numberOfLines={1}>
                                {formatDate(app.interviewDate)}{'\n'}
                                {app.interviewTime}
                              </Text>
                              {(app as any).interviewDescription && (
                                <Text style={[styles.tableCellText, { fontSize: 11, color: '#64748B', marginTop: 4 }]} numberOfLines={2}>
                                  📝 {(app as any).interviewDescription}
                                </Text>
                              )}
                            </View>
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
                        {app.status !== 'accepted' && app.status !== 'rejected' && (
                          <>
                            <TouchableOpacity
                              style={[
                                styles.tableActionButton, 
                                styles.scheduleButton,
                                (app.status !== 'pending' && app.status !== 'reviewed') && styles.tableActionButtonDisabled
                              ]}
                              onPress={() => handleScheduleInterview(app)}
                              disabled={app.status !== 'pending' && app.status !== 'reviewed'}
                            >
                              <Text style={[
                                styles.tableActionButtonText,
                                (app.status !== 'pending' && app.status !== 'reviewed') && styles.tableActionButtonTextDisabled
                              ]}>
                                {app.interviewDate ? '✏️ Reschedule' : '📅 Schedule'}
                              </Text>
                            </TouchableOpacity>
                            {app.status === 'reviewed' && isInterviewTimePassed(app) && (
                              <TouchableOpacity
                                style={[styles.tableActionButton, styles.hireButton]}
                                onPress={() => handleHireApplication(app)}
                              >
                                <Text style={styles.tableActionButtonText}>✅ Hire</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[
                                styles.tableActionButton, 
                                styles.rejectButton,
                                (app.status !== 'pending' && app.status !== 'reviewed') && styles.tableActionButtonDisabled
                              ]}
                              onPress={() => handleRejectApplication(app)}
                              disabled={app.status !== 'pending' && app.status !== 'reviewed'}
                            >
                              <Text style={[
                                styles.tableActionButtonText,
                                (app.status !== 'pending' && app.status !== 'reviewed') && styles.tableActionButtonTextDisabled
                              ]}>
                                ❌ Reject
                              </Text>
                            </TouchableOpacity>
                          </>
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
                <Text style={styles.label}>Job Type *</Text>
                <View style={styles.jobTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.jobTypeOption,
                      jobType === 'full_time' && styles.jobTypeOptionSelected
                    ]}
                    onPress={() => {
                      setJobType('full_time');
                      setPostJobError(null);
                    }}
                    disabled={isPostingJob}
                  >
                    <View style={[
                      styles.jobTypeRadio,
                      jobType === 'full_time' && styles.jobTypeRadioSelected
                    ]}>
                      {jobType === 'full_time' && <View style={styles.jobTypeRadioInner} />}
                    </View>
                    <Text style={[
                      styles.jobTypeLabel,
                      jobType === 'full_time' && styles.jobTypeLabelSelected
                    ]}>Full Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.jobTypeOption,
                      jobType === 'part_time' && styles.jobTypeOptionSelected
                    ]}
                    onPress={() => {
                      setJobType('part_time');
                      setPostJobError(null);
                    }}
                    disabled={isPostingJob}
                  >
                    <View style={[
                      styles.jobTypeRadio,
                      jobType === 'part_time' && styles.jobTypeRadioSelected
                    ]}>
                      {jobType === 'part_time' && <View style={styles.jobTypeRadioInner} />}
                    </View>
                    <Text style={[
                      styles.jobTypeLabel,
                      jobType === 'part_time' && styles.jobTypeLabelSelected
                    ]}>Part Time</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Deadline Date *</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.deadlineInputWrapper}>
                    {/* @ts-ignore - HTML input for web date picker */}
                    <input
                      type="date"
                      value={deadlineDate || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e: any) => {
                        setDeadlineDate(e.target.value || '');
                        setPostJobError(null);
                      }}
                      disabled={isPostingJob}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: 16,
                        border: '2px solid #E2E8F0',
                        borderRadius: 12,
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        cursor: isPostingJob ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.deadlinePickerButton, isPostingJob && styles.deadlinePickerButtonDisabled]}
                    onPress={() => !isPostingJob && setShowDeadlineDatePicker(true)}
                    disabled={isPostingJob}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deadlinePickerButtonLeft}>
                      <Text style={styles.deadlinePickerIcon}>📅</Text>
                      <Text style={deadlineDate ? styles.deadlinePickerText : styles.deadlinePickerPlaceholder}>
                        {deadlineDate ? (() => {
                          const d = new Date(deadlineDate);
                          return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                        })() : 'Select deadline date'}
                      </Text>
                    </View>
                    <Text style={styles.deadlinePickerArrow}>›</Text>
                  </TouchableOpacity>
                )}
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
                style={[styles.modalButton, styles.submitButton, (isPostingJob || !jobTitle.trim() || !description.trim() || !deadlineDate || !jobType) && styles.submitButtonDisabled]}
                onPress={handlePostJob}
                disabled={isPostingJob || !jobTitle.trim() || !description.trim() || !deadlineDate || !jobType}
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
                {Platform.OS === 'web' ? (
                  <View style={styles.deadlineInputWrapper}>
                    {/* @ts-ignore - HTML input for web date picker */}
                    <input
                      type="date"
                      value={deadlineDate || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e: any) => setDeadlineDate(e.target.value || '')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: 16,
                        border: '2px solid #E2E8F0',
                        borderRadius: 12,
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deadlinePickerButton}
                    onPress={() => setShowDeadlineDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.deadlinePickerButtonLeft}>
                      <Text style={styles.deadlinePickerIcon}>📅</Text>
                      <Text style={deadlineDate ? styles.deadlinePickerText : styles.deadlinePickerPlaceholder}>
                        {deadlineDate ? (() => {
                          const d = new Date(deadlineDate);
                          return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                        })() : 'Select deadline date'}
                      </Text>
                    </View>
                    <Text style={styles.deadlinePickerArrow}>›</Text>
                  </TouchableOpacity>
                )}
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

      {/* Deadline Date Picker Modal (Mobile) */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showDeadlineDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDeadlineDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Deadline Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDeadlineDatePicker(false)}
                  style={styles.pickerModalCloseButton}
                >
                  <Text style={styles.pickerModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalBody}>
                {(() => {
                  const dates: string[] = [];
                  const today = new Date();
                  for (let i = 1; i <= 90; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    dates.push(date.toISOString().split('T')[0]);
                  }
                  return dates.map((date) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const year = dateObj.getFullYear();
                    const isSelected = deadlineDate === date;
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.pickerModalItem,
                          isSelected && styles.pickerModalItemSelected
                        ]}
                        onPress={() => {
                          setDeadlineDate(date);
                          setShowDeadlineDatePicker(false);
                          setPostJobError(null);
                        }}
                      >
                        <Text style={[
                          styles.pickerModalItemText,
                          isSelected && styles.pickerModalItemTextSelected
                        ]}>
                          {dayName}, {month} {day}, {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
          setInterviewDescription('');
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
                  setInterviewDescription('');
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <View style={styles.modernJobInfoContainer}>
                <View style={styles.modernJobInfoHeader}>
                  <View style={styles.modernJobInfoIconContainer}>
                    <Text style={styles.modernJobInfoIcon}>💼</Text>
                  </View>
                  <View style={styles.modernJobInfoContent}>
                    <Text style={styles.modernJobInfoTitle}>{selectedApplication.jobTitle}</Text>
                    <Text style={styles.modernJobInfoDescription}>
                      Applicant: {selectedApplication.applicantFirstName && selectedApplication.applicantLastName 
                        ? `${selectedApplication.applicantFirstName} ${selectedApplication.applicantLastName}`
                        : selectedApplication.applicantEmail}
                    </Text>
                  </View>
                </View>
                {selectedApplication.interviewDate && selectedApplication.interviewTime && (
                  <View style={styles.modernCurrentInterviewContainer}>
                    <Text style={styles.modernCurrentInterviewLabel}>Current Interview</Text>
                    <Text style={styles.modernCurrentInterviewText}>
                      {formatDate(selectedApplication.interviewDate)} at {selectedApplication.interviewTime}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.modernFormGroup}>
                <Text style={styles.modernLabel}>
                  <Text style={styles.modernLabelText}>Interview Date</Text>
                  <Text style={styles.modernLabelRequired}> *</Text>
                </Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.modernWebInputContainer}>
                    <View style={styles.modernWebInputIconWrapper}>
                      <View style={styles.modernPickerIconContainer}>
                        <Text style={styles.modernPickerIcon}>📅</Text>
                      </View>
                      {/* @ts-ignore - React Native Web supports HTML input elements */}
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e: any) => setInterviewDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontFamily: 'inherit',
                          backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                        }}
                        onFocus={(e: any) => {
                          e.target.style.borderColor = '#8B5CF6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                          e.target.style.backgroundImage = 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)';
                        }}
                        onBlur={(e: any) => {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                          e.target.style.backgroundImage = 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)';
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.modernPickerButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modernPickerButtonLeft}>
                      <View style={styles.modernPickerIconContainer}>
                        <Text style={styles.modernPickerIcon}>📅</Text>
                      </View>
                      <Text style={interviewDate ? styles.modernPickerButtonText : styles.modernPickerButtonPlaceholder}>
                        {interviewDate ? (() => {
                          const date = new Date(interviewDate);
                          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                        })() : 'Select Date'}
                      </Text>
                    </View>
                    <Text style={styles.modernPickerArrow}>›</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modernFormGroup}>
                <Text style={styles.modernLabel}>
                  <Text style={styles.modernLabelText}>Interview Time</Text>
                  <Text style={styles.modernLabelRequired}> *</Text>
                </Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.modernWebInputContainer}>
                    <View style={styles.modernWebInputIconWrapper}>
                      <View style={styles.modernPickerIconContainer}>
                        <Text style={styles.modernPickerIcon}>🕐</Text>
                      </View>
                      {/* @ts-ignore - React Native Web supports HTML input elements */}
                      <input
                        type="time"
                        value={interviewTime}
                        onChange={(e: any) => setInterviewTime(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          fontSize: '16px',
                          border: '2px solid #E2E8F0',
                          borderRadius: '12px',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontFamily: 'inherit',
                          backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                        }}
                        onFocus={(e: any) => {
                          e.target.style.borderColor = '#8B5CF6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                          e.target.style.backgroundImage = 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)';
                        }}
                        onBlur={(e: any) => {
                          e.target.style.borderColor = '#E2E8F0';
                          e.target.style.boxShadow = 'none';
                          e.target.style.backgroundImage = 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)';
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.modernPickerButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modernPickerButtonLeft}>
                      <View style={styles.modernPickerIconContainer}>
                        <Text style={styles.modernPickerIcon}>🕐</Text>
                      </View>
                      <Text style={interviewTime ? styles.modernPickerButtonText : styles.modernPickerButtonPlaceholder}>
                        {interviewTime ? (() => {
                          const [hours, minutes] = interviewTime.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour % 12 || 12;
                          return `${displayHour}:${minutes} ${ampm}`;
                        })() : 'Select Time'}
                      </Text>
                    </View>
                    <Text style={styles.modernPickerArrow}>›</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modernFormGroup}>
                <Text style={styles.modernLabel}>
                  <Text style={styles.modernLabelText}>Description / Instructions</Text>
                  <Text style={styles.modernLabelRequired}> *</Text>
                </Text>
                {Platform.OS === 'web' ? (
                  // @ts-ignore - React Native Web supports HTML textarea elements
                  <textarea
                    value={interviewDescription}
                    onChange={(e: any) => setInterviewDescription(e.target.value)}
                    placeholder="Enter what the applicant needs to do or prepare for the interview..."
                    style={{
                      width: '100%',
                      minHeight: 120,
                      padding: '16px',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '16px',
                      color: '#1E293B',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    } as any}
                    onFocus={(e: any) => {
                      e.target.style.borderColor = '#8B5CF6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                    }}
                    onBlur={(e: any) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ) : (
                  <TextInput
                    style={[styles.modernInput, styles.modernTextArea]}
                    placeholder="Enter what the applicant needs to do or prepare for the interview..."
                    value={interviewDescription}
                    onChangeText={setInterviewDescription}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    placeholderTextColor="#94A3B8"
                  />
                )}
                <Text style={styles.modernHelperText}>
                  Describe what the applicant should prepare or what will happen during the interview
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modernModalFooter}>
              <TouchableOpacity
                style={styles.modernCancelButton}
                onPress={() => {
                  setShowInterviewModal(false);
                  setSelectedApplication(null);
                  setInterviewDate('');
                  setInterviewTime('');
                  setInterviewDescription('');
                  setErrorMessage(null);
                  setShowErrorTooltip(false);
                  setSuccessMessage(null);
                  setShowSuccessTooltip(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modernCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modernSubmitButton}
                onPress={handleSubmitInterview}
                activeOpacity={0.8}
              >
                <Text style={styles.modernSubmitButtonText}>
                  {selectedApplication?.interviewDate ? 'Reschedule Interview' : 'Schedule Interview'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
          {/* Success Tooltip (Web) */}
          {Platform.OS === 'web' && showSuccessTooltip && successMessage && (
            <View style={styles.successTooltip}>
              <View style={styles.successTooltipContent}>
                <Text style={styles.successTooltipIcon}>✓</Text>
                <Text style={styles.successTooltipText}>{successMessage}</Text>
                <TouchableOpacity 
                  style={styles.successTooltipClose}
                  onPress={() => {
                    setShowSuccessTooltip(false);
                    setSuccessMessage(null);
                  }}
                >
                  <Text style={styles.successTooltipCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error Tooltip (Web) */}
          {Platform.OS === 'web' && showErrorTooltip && errorMessage && (
            <View style={styles.errorTooltip}>
              <View style={styles.errorTooltipContent}>
                <Text style={styles.errorTooltipIcon}>⚠️</Text>
                <Text style={styles.errorTooltipText}>{errorMessage}</Text>
                <TouchableOpacity 
                  style={styles.errorTooltipClose}
                  onPress={() => {
                    setShowErrorTooltip(false);
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.errorTooltipCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
      </Modal>

      {/* Date Picker Modal (Mobile) */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.pickerModalCloseButton}
                >
                  <Text style={styles.pickerModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalBody}>
                {(() => {
                  const dates: string[] = [];
                  const today = new Date();
                  for (let i = 0; i < 90; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    dates.push(date.toISOString().split('T')[0]);
                  }
                  return dates.map((date) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const day = dateObj.getDate();
                    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const year = dateObj.getFullYear();
                    const isSelected = interviewDate === date;
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.pickerModalItem,
                          isSelected && styles.pickerModalItemSelected
                        ]}
                        onPress={() => {
                          setInterviewDate(date);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerModalItemText,
                          isSelected && styles.pickerModalItemTextSelected
                        ]}>
                          {dayName}, {month} {day}, {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker Modal (Mobile) */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Time</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.pickerModalCloseButton}
                >
                  <Text style={styles.pickerModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerModalBody}>
                {(() => {
                  const times: string[] = [];
                  for (let hour = 8; hour < 20; hour++) {
                    for (let minute = 0; minute < 60; minute += 30) {
                      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                      times.push(timeStr);
                    }
                  }
                  return times.map((time) => {
                    const [hours, minutes] = time.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    const displayTime = `${displayHour}:${minutes} ${ampm}`;
                    const isSelected = interviewTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.pickerModalItem,
                          isSelected && styles.pickerModalItemSelected
                        ]}
                        onPress={() => {
                          setInterviewTime(time);
                          setShowTimePicker(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerModalItemText,
                          isSelected && styles.pickerModalItemTextSelected
                        ]}>
                          {displayTime}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Hire Application Modal */}
      <Modal
        visible={showHireModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowHireModal(false);
          setSelectedApplication(null);
          setHireNote('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hire Applicant</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowHireModal(false);
                  setSelectedApplication(null);
                  setHireNote('');
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
                <Text style={styles.label}>Hiring Note *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Please provide a note for hiring this applicant..."
                  value={hireNote}
                  onChangeText={setHireNote}
                  multiline={true}
                  numberOfLines={5}
                  maxLength={500}
                />
                <Text style={styles.helperText}>
                  {hireNote.length}/500 characters
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowHireModal(false);
                  setSelectedApplication(null);
                  setHireNote('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.hireButtonModal]}
                onPress={handleSubmitHire}
              >
                <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Hire Applicant</Text>
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
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
  },
  content: {
    padding: isMobile ? 12 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isMobile ? 16 : 24,
    width: '100%',
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
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 8 : 6,
    paddingVertical: Platform.OS === 'web' ? 4 : 2,
  },
  progressStep: {
    alignItems: 'center',
    minWidth: Platform.OS === 'web' ? 60 : 50,
  },
  progressStepCircle: {
    width: Platform.OS === 'web' ? 32 : 28,
    height: Platform.OS === 'web' ? 32 : 28,
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  progressStepCircleCompleted: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  progressStepCircleCurrent: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
    } as any : {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  progressStepCircleRejected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  progressStepIcon: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
  },
  progressStepLabel: {
    fontSize: Platform.OS === 'web' ? 9 : 8,
    color: '#94A3B8',
    marginTop: Platform.OS === 'web' ? 4 : 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressStepLabelActive: {
    color: '#1E293B',
    fontWeight: '600',
  },
  progressBarLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: Platform.OS === 'web' ? 4 : 2,
    marginTop: Platform.OS === 'web' ? -16 : -14,
  },
  progressBarLineCompleted: {
    backgroundColor: '#3B82F6',
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
  tableActionButtonDisabled: {
    backgroundColor: '#E2E8F0',
    opacity: 0.5,
  },
  tableActionButtonTextDisabled: {
    color: '#94A3B8',
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
  hireButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  tableActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 0,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(4px)',
    } as any : {}),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 600,
    maxHeight: Platform.OS === 'web' ? '90%' : '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } as any : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as any : {}),
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '600',
  },
  jobInfoContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalBody: {
    padding: 24,
    maxHeight: Platform.OS === 'web' ? 400 : undefined,
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
  jobTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  jobTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  jobTypeOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
    } : {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  jobTypeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  jobTypeRadioSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#8B5CF6',
  },
  jobTypeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  jobTypeLabel: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  jobTypeLabelSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
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
  hireButtonModal: {
    backgroundColor: '#10B981',
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
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  pickerButtonPlaceholder: {
    fontSize: 16,
    color: '#95A5A6',
  },
  pickerButtonIcon: {
    fontSize: 20,
  },
  modernJobInfoContainer: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
      borderLeftWidth: 4,
      borderLeftColor: '#8B5CF6',
      paddingLeft: 24,
    } as any : {}),
  },
  modernJobInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modernJobInfoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
      transform: 'scale(1)',
      transition: 'all 0.3s ease',
    } as any : {}),
  },
  modernJobInfoIconContainerWeb: {
    ...(Platform.OS === 'web' ? {
      ':hover': {
        transform: 'scale(1.05)',
        boxShadow: '0 6px 16px rgba(139, 92, 246, 0.3)',
      },
    } as any : {}),
  },
  modernJobInfoTitleWeb: {
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    } as any : {}),
  },
  modernJobInfoDescriptionWeb: {
    ...(Platform.OS === 'web' ? {
      color: '#475569',
      fontWeight: '500',
    } as any : {}),
  },
  modernJobInfoIcon: {
    fontSize: 24,
  },
  modernJobInfoContent: {
    flex: 1,
  },
  modernJobInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  modernJobInfoDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  modernCurrentInterviewContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  modernCurrentInterviewContainerWeb: {
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)',
      borderLeftWidth: 4,
      padding: 16,
    } as any : {}),
  },
  modernCurrentInterviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modernCurrentInterviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modernFormGroup: {
    marginBottom: 20,
  },
  modernLabel: {
    marginBottom: 8,
  },
  modernLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modernLabelRequired: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  modernWebInputWrapper: {
    width: '100%',
  },
  modernWebInputContainer: {
    width: '100%',
    position: 'relative',
  },
  modernWebInputIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      gap: '12px',
    } as any : {}),
  },
  modernPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  modernPickerButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernPickerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernPickerIcon: {
    fontSize: 20,
  },
  modernPickerButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  modernPickerButtonPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modernPickerArrow: {
    fontSize: 24,
    color: '#94A3B8',
    fontWeight: '300',
  },
  deadlineInputWrapper: {
    width: '100%',
  },
  deadlinePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 52,
  },
  deadlinePickerButtonDisabled: {
    opacity: 0.6,
  },
  deadlinePickerButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deadlinePickerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  deadlinePickerText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  deadlinePickerPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  deadlinePickerArrow: {
    fontSize: 24,
    color: '#94A3B8',
    fontWeight: '300',
  },
  modernInput: {
    width: '100%',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? {
      outlineWidth: 0,
      outlineStyle: 'none',
      outlineColor: 'transparent',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    } as any : {}),
  },
  modernTextArea: {
    minHeight: 120,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  modernHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  modernModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  modernCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  modernCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modernSubmitButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
    } : {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  modernSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  pickerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  pickerModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalCloseText: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: 'bold',
  },
  pickerModalBody: {
    maxHeight: 400,
  },
  pickerModalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  pickerModalItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  pickerModalItemText: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '500',
  },
  pickerModalItemTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  webInputWrapper: {
    width: '100%',
  },
  successTooltip: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 20,
    right: 20,
    zIndex: 10000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  successTooltipContent: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 300,
    maxWidth: 600,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  successTooltipIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 12,
  },
  successTooltipText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successTooltipClose: {
    padding: 4,
    marginLeft: 12,
  },
  successTooltipCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorTooltip: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 20,
    right: 20,
    zIndex: 10000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  errorTooltipContent: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 300,
    maxWidth: 600,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  errorTooltipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorTooltipText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorTooltipClose: {
    padding: 4,
    marginLeft: 12,
  },
  errorTooltipCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

