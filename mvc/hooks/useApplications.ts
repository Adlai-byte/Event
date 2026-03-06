import { useState } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '../models/User';
import { JobApplication } from '../types/hiring';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';

interface ApplicationsResponse {
  ok: boolean;
  applications?: JobApplication[];
  error?: string;
}

interface MutationResponse {
  ok: boolean;
  error?: string;
}

export function useApplications(user?: User, activeTab?: string) {
  const queryClient = useQueryClient();

  // --- React Query: load applications ---
  const { data: applications = [], refetch: _refetch } = useQuery<JobApplication[]>({
    queryKey: ['provider-applications', user?.email],
    queryFn: async () => {
      const data = await apiClient.get<ApplicationsResponse>('/api/provider/job-applications', {
        providerEmail: user!.email,
      });
      if (!data.ok) {
        throw new Error(data.error || 'Failed to load applications');
      }
      return data.applications || [];
    },
    enabled: !!user?.email && (activeTab === undefined || activeTab === 'applications'),
  });

  // Expose loadApplications as a simple refetch/invalidation wrapper
  const loadApplications = async () => {
    await queryClient.invalidateQueries({ queryKey: ['provider-applications'] });
  };

  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);

  // Interview modal states
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewDescription, setInterviewDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Hire/Reject modal states
  const [showHireModal, setShowHireModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hireNote, setHireNote] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');

  // Tooltip/error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessTooltip, setShowSuccessTooltip] = useState(false);

  // --- Mutation: schedule interview ---
  const interviewMutation = useMutation<MutationResponse, Error, void>({
    mutationFn: async () => {
      const data = await apiClient.put<MutationResponse>(
        `/api/provider/job-applications/${selectedApplication!.id}/schedule-interview`,
        {
          providerEmail: user!.email,
          interviewDate,
          interviewTime,
          interviewDescription,
        },
      );
      if (!data.ok) {
        throw new Error(data.error || 'Failed to schedule interview');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] });
      const successMsg = selectedApplication?.interviewDate
        ? 'Interview rescheduled successfully'
        : 'Interview scheduled successfully';

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
        }, 2000);
      } else {
        Alert.alert('Success', successMsg);
        setShowInterviewModal(false);
        setSelectedApplication(null);
        setInterviewDate('');
        setInterviewTime('');
      }
    },
    onError: (error: Error) => {
      if (__DEV__) console.error('Failed to schedule interview:', error);
      const errorMsg = error.message || 'Failed to schedule interview. Please try again.';
      if (Platform.OS === 'web') {
        setErrorMessage(errorMsg);
        setShowErrorTooltip(true);
        setTimeout(() => {
          setShowErrorTooltip(false);
        }, 5000);
      } else {
        Alert.alert('Error', errorMsg);
      }
    },
  });

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

    interviewMutation.mutate();
  };

  // --- Mutation: hire applicant ---
  const hireMutation = useMutation<MutationResponse, Error, void>({
    mutationFn: async () => {
      const data = await apiClient.put<MutationResponse>(
        `/api/provider/job-applications/${selectedApplication!.id}/accept`,
        {
          providerEmail: user!.email,
          hireNote: hireNote.trim(),
        },
      );
      if (!data.ok) {
        throw new Error(data.error || 'Failed to hire applicant');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] });

      if (Platform.OS === 'web') {
        setSuccessMessage('Applicant hired successfully!');
        setShowSuccessTooltip(true);
        setTimeout(() => {
          setShowSuccessTooltip(false);
          setSuccessMessage(null);
          setShowHireModal(false);
          setSelectedApplication(null);
          setHireNote('');
        }, 2000);
      } else {
        Alert.alert('Success', 'Applicant hired successfully!');
        setShowHireModal(false);
        setSelectedApplication(null);
        setHireNote('');
      }
    },
    onError: (error: Error) => {
      if (__DEV__) console.error('Failed to hire applicant:', error);
      const errorMsg = error.message || 'Failed to hire applicant. Please try again.';
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
    },
  });

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

    hireMutation.mutate();
  };

  // --- Mutation: reject application ---
  const rejectMutation = useMutation<MutationResponse, Error, void>({
    mutationFn: async () => {
      const data = await apiClient.put<MutationResponse>(
        `/api/provider/job-applications/${selectedApplication!.id}/reject`,
        {
          providerEmail: user!.email,
          rejectionNote: rejectionNote.trim(),
        },
      );
      if (!data.ok) {
        throw new Error(data.error || 'Failed to reject application');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] });
      Alert.alert('Success', 'Application rejected successfully');
      setShowRejectModal(false);
      setSelectedApplication(null);
      setRejectionNote('');
    },
    onError: (error: Error) => {
      if (__DEV__) console.error('Failed to reject application:', error);
      Alert.alert('Error', error.message || 'Failed to reject application');
    },
  });

  const handleSubmitRejection = async () => {
    if (!user?.email || !selectedApplication) return;

    if (!rejectionNote.trim()) {
      Alert.alert('Validation Error', 'Please provide a rejection note');
      return;
    }

    rejectMutation.mutate();
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
        if (__DEV__) console.warn('Invalid date format:', dateStr);
        return false;
      }

      const interviewYear = parseInt(dateParts[0]);
      const interviewMonth = parseInt(dateParts[1]) - 1; // Month is 0-indexed
      const interviewDay = parseInt(dateParts[2]);

      // Parse time (HH:MM:SS or HH:MM format)
      const timeStr = String(application.interviewTime).trim();
      const timeParts = timeStr.split(':');

      if (timeParts.length < 2) {
        if (__DEV__) console.warn('Invalid time format:', timeStr);
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
        interviewSecond,
      );

      // Get current date/time
      const now = new Date();

      // Compare
      const hasPassed = interviewDateTime < now;

      // Debug logging (only on web or when needed)
      if (Platform.OS === 'web' || hasPassed) {
        // intentionally empty — debug logging removed
      }

      return hasPassed;
    } catch (error) {
      if (__DEV__)
        console.error('Error checking interview time:', error, {
          interviewDate: application.interviewDate,
          interviewTime: application.interviewTime,
        });
      return false;
    }
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

  const handleHireApplication = (application: JobApplication) => {
    if (!user?.email) return;
    setSelectedApplication(application);
    setHireNote('');
    setShowHireModal(true);
  };

  const handleRejectApplication = (application: JobApplication) => {
    setSelectedApplication(application);
    setRejectionNote('');
    setShowRejectModal(true);
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
      if (__DEV__) console.error('Failed to download resume:', error);
      Alert.alert('Error', 'Failed to download resume');
    }
  };

  return {
    applications,
    selectedApplication,
    setSelectedApplication,
    showInterviewModal,
    setShowInterviewModal,
    interviewDate,
    setInterviewDate,
    interviewTime,
    setInterviewTime,
    interviewDescription,
    setInterviewDescription,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    showHireModal,
    setShowHireModal,
    showRejectModal,
    setShowRejectModal,
    hireNote,
    setHireNote,
    rejectionNote,
    setRejectionNote,
    errorMessage,
    setErrorMessage,
    showErrorTooltip,
    setShowErrorTooltip,
    successMessage,
    setSuccessMessage,
    showSuccessTooltip,
    setShowSuccessTooltip,
    loadApplications,
    handleScheduleInterview,
    handleSubmitInterview,
    isInterviewTimePassed,
    handleHireApplication,
    handleSubmitHire,
    handleRejectApplication,
    handleSubmitRejection,
    handleDownloadResume,
  };
}
