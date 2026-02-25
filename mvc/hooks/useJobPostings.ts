import { useState, useEffect, useRef, useMemo } from 'react';
import { Alert, Platform, Animated } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '../models/User';
import { JobPosting } from '../types/hiring';
import { apiClient } from '../services/apiClient';

interface JobPostingsResponse {
  ok: boolean;
  jobPostings?: JobPosting[];
  error?: string;
}

interface MutationResponse {
  ok: boolean;
  error?: string;
}

export function useJobPostings(user?: User) {
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form states
  const [jobTitle, setJobTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [jobType, setJobType] = useState<'full_time' | 'part_time'>('full_time');

  // Modal states
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [showDeadlineDatePicker, setShowDeadlineDatePicker] = useState(false);

  // Post job states
  const [isPostingJob, setIsPostingJob] = useState(false);
  const [postJobError, setPostJobError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const errorToastOpacity = useRef(new Animated.Value(0)).current;

  // ── Query: load job postings ──────────────────────────────────────────
  const {
    data: queryData,
    isLoading,
    refetch,
  } = useQuery<JobPostingsResponse>({
    queryKey: ['provider-job-postings', user?.email],
    queryFn: () =>
      apiClient.get<JobPostingsResponse>('/api/provider/job-postings', {
        providerEmail: user!.email,
      }),
    enabled: !!user?.email,
  });

  const jobPostings = queryData?.ok ? (queryData.jobPostings ?? []) : [];
  const loading = isLoading;

  // ── Mutations ─────────────────────────────────────────────────────────

  const postJobMutation = useMutation<MutationResponse, Error, void>({
    mutationFn: () =>
      apiClient.post<MutationResponse>('/api/provider/job-postings', {
        providerEmail: user!.email,
        jobTitle: jobTitle.trim(),
        description: description.trim(),
        deadlineDate: deadlineDate,
        jobType: jobType,
      }),
    onSuccess: (data) => {
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
          queryClient.invalidateQueries({ queryKey: ['provider-job-postings'] });
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
    },
    onError: (error: any) => {
      console.error('Failed to create job posting:', error);

      let errorMsg = 'Failed to create job posting. Please check your internet connection and try again.';

      if (error.message) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorMsg = 'Request timed out. Please try again.';
        }
      }

      setPostJobError(errorMsg);
      displayErrorToast(errorMsg);
      setIsPostingJob(false);
    },
  });

  const updateJobMutation = useMutation<
    MutationResponse,
    Error,
    { jobId: number; body: Record<string, any> }
  >({
    mutationFn: ({ jobId, body }) =>
      apiClient.put<MutationResponse>(`/api/provider/job-postings/${jobId}`, body),
    onSuccess: (data) => {
      if (data.ok) {
        Alert.alert('Success', 'Job posting updated successfully');
        setShowEditModal(false);
        setEditingJob(null);
        resetForm();
        queryClient.invalidateQueries({ queryKey: ['provider-job-postings'] });
      } else {
        Alert.alert('Error', data.error || 'Failed to update job posting');
      }
    },
    onError: (error) => {
      console.error('Failed to update job posting:', error);
      Alert.alert('Error', 'Failed to update job posting');
    },
  });

  const deleteJobMutation = useMutation<MutationResponse, Error, number>({
    mutationFn: (jobId: number) =>
      apiClient.delete<MutationResponse>(
        `/api/provider/job-postings/${jobId}?providerEmail=${encodeURIComponent(user!.email)}`
      ),
    onSuccess: (data) => {
      if (data.ok) {
        Alert.alert('Success', 'Job posting deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['provider-job-postings'] });
      } else {
        Alert.alert('Error', data.error || 'Failed to delete job posting');
      }
    },
    onError: (error) => {
      console.error('Failed to delete job posting:', error);
      Alert.alert('Error', 'Failed to delete job posting');
    },
  });

  const toggleStatusMutation = useMutation<
    MutationResponse,
    Error,
    { job: JobPosting }
  >({
    mutationFn: ({ job }) => {
      const newStatus = job.status === 'active' ? 'closed' : 'active';
      return apiClient.put<MutationResponse>(
        `/api/provider/job-postings/${job.id}`,
        {
          providerEmail: user!.email,
          status: newStatus,
        }
      );
    },
    onSuccess: (data) => {
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['provider-job-postings'] });
      } else {
        Alert.alert('Error', data.error || 'Failed to update status');
      }
    },
    onError: (error) => {
      console.error('Failed to update status:', error);
      Alert.alert('Error', 'Failed to update status');
    },
  });

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

  const resetForm = () => {
    setJobTitle('');
    setDescription('');
    setDeadlineDate('');
    setJobType('full_time');
    setEditingJob(null);
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

    postJobMutation.mutate();
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

    updateJobMutation.mutate({
      jobId: editingJob.id,
      body: {
        providerEmail: user.email,
        jobTitle: jobTitle.trim(),
        description: description.trim(),
        deadlineDate: deadlineDate,
      },
    });
  };

  const handleDeleteJob = (jobId: number) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this job posting?');
      if (confirmed) {
        deleteJobMutation.mutate(jobId);
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
            onPress: () => deleteJobMutation.mutate(jobId),
          },
        ]
      );
    }
  };

  const handleToggleStatus = async (job: JobPosting) => {
    if (!user?.email) return;
    toggleStatusMutation.mutate({ job });
  };

  const loadJobPostings = () => {
    queryClient.invalidateQueries({ queryKey: ['provider-job-postings'] });
  };

  const filteredJobPostings = useMemo(
    () =>
      jobPostings.filter((job) => {
        if (filterStatus === 'all') return true;
        return job.status === filterStatus;
      }),
    [jobPostings, filterStatus]
  );

  return {
    jobPostings,
    filteredJobPostings,
    loading,
    filterStatus,
    setFilterStatus,
    jobTitle,
    setJobTitle,
    description,
    setDescription,
    deadlineDate,
    setDeadlineDate,
    jobType,
    setJobType,
    showPostModal,
    setShowPostModal,
    showEditModal,
    setShowEditModal,
    editingJob,
    showDeadlineDatePicker,
    setShowDeadlineDatePicker,
    isPostingJob,
    postJobError,
    setPostJobError,
    showSuccessToast,
    showErrorToast,
    errorToastMessage,
    toastOpacity,
    errorToastOpacity,
    resetForm,
    handlePostJob,
    handleEditJob,
    handleUpdateJob,
    handleDeleteJob,
    handleToggleStatus,
    loadJobPostings,
  };
}
