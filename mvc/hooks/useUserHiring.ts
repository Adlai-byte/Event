import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiringController } from '../controllers/HiringController';
import {
  HiringRequest,
  HiringStatus,
  Proposal,
  ProposalStatus,
  ExperienceLevel,
  ContractType,
} from '../models/Hiring';
import { apiClient } from '../services/apiClient';
import { ApiError } from '../types/api';

interface Booking {
  idbooking: number;
  b_event_name: string;
  b_event_date: string;
  b_start_time: string;
  b_end_time: string;
  b_location: string;
}

interface UseUserHiringParams {
  userId: string;
  userEmail?: string;
  userType: 'client' | 'provider';
}

export function useUserHiring({ userId, userEmail, userType }: UseUserHiringParams) {
  const queryClient = useQueryClient();

  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'jobPostings' | 'myApplications'>(
    'jobPostings',
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [selectedHiringRequest, setSelectedHiringRequest] = useState<HiringRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobPostingSearch, setJobPostingSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJobPosting, setSelectedJobPosting] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create hiring request form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [eventId, setEventId] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [locationType, setLocationType] = useState<'remote' | 'on-site' | 'hybrid'>('on-site');
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

  // --- React Query: Job Postings ---
  const jobPostingsQuery = useQuery({
    queryKey: ['user-job-postings', jobPostingSearch],
    queryFn: async () => {
      const params: Record<string, string> = { status: 'active' };
      if (jobPostingSearch) {
        params.search = jobPostingSearch;
      }
      const data = await apiClient.get<any>('/api/job-postings', params);
      if (data.ok && data.jobPostings) {
        return data.jobPostings as any[];
      }
      return [] as any[];
    },
  });

  // --- React Query: My Applications ---
  const myApplicationsQuery = useQuery({
    queryKey: ['user-applications', userEmail],
    queryFn: async () => {
      const data = await apiClient.get<any>('/api/user/job-applications', {
        userEmail: userEmail!,
      });
      if (data.ok && data.applications) {
        return data.applications as any[];
      }
      return [] as any[];
    },
    enabled: !!userEmail,
  });

  // --- React Query: Bookings ---
  const bookingsQuery = useQuery({
    queryKey: ['user-hiring-bookings', userEmail],
    queryFn: async () => {
      const data = await apiClient.get<any>('/api/user/bookings', {
        email: userEmail!,
      });
      if (data.ok && data.rows) {
        return data.rows.map((b: any) => ({
          idbooking: b.idbooking,
          b_event_name: b.b_event_name,
          b_event_date: b.b_event_date,
          b_start_time: b.b_start_time,
          b_end_time: b.b_end_time,
          b_location: b.b_location,
        })) as Booking[];
      }
      return [] as Booking[];
    },
    enabled: !!userEmail && userType === 'client',
  });

  // Derived data from queries
  const jobPostings = jobPostingsQuery.data ?? [];
  const myApplications = myApplicationsQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];

  // --- React Query: Submit Application Mutation ---
  const submitApplicationMutation = useMutation({
    mutationFn: async (applicationData: {
      jobPostingId: number;
      userEmail: string;
      resumeFile: string;
      resumeFileName: string;
    }) => {
      return apiClient.post<any>('/api/job-applications', applicationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
    },
  });

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'reviewed':
        return '#3b82f6';
      case 'accepted':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const hasAppliedToJob = (jobId: number): boolean => {
    return myApplications.some((app) => app.jobPostingId === jobId);
  };

  const getApplicationStatusForJob = (jobId: number): string | null => {
    const application = myApplications.find((app) => app.jobPostingId === jobId);
    return application ? application.status : null;
  };

  // Wrap query refetch calls to preserve the same callable signature for consumers
  const loadJobPostings = useCallback(async () => {
    await jobPostingsQuery.refetch();
  }, [jobPostingsQuery.refetch]);

  const loadMyApplications = useCallback(async () => {
    if (!userEmail) return;
    await myApplicationsQuery.refetch();
  }, [userEmail, myApplicationsQuery.refetch]);

  const loadBookings = useCallback(async () => {
    if (!userEmail) return;
    await bookingsQuery.refetch();
  }, [userEmail, bookingsQuery.refetch]);

  const loadData = useCallback(async () => {
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

    if (userType === 'provider') {
      const proposalsResult = await hiringController.getProviderProposals(userId);
      if (proposalsResult.success && proposalsResult.proposals) {
        setProposals(proposalsResult.proposals);
      }
    }

    await jobPostingsQuery.refetch();

    setLoading(false);
  }, [userId, userType]);

  const loadProposalsForRequest = useCallback(async (hiringRequestId: string) => {
    try {
      const result = await hiringController.getHiringRequestProposals(hiringRequestId);
      if (result.success && result.proposals) {
        setProposals(result.proposals);
        setShowProposalsModal(true);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading proposals:', error);
    }
  }, []);

  useEffect(() => {
    loadData();

    const unsubscribeRequests = hiringController.subscribeToHiringRequests(
      userId,
      userType,
      (updatedRequests) => {
        setHiringRequests(updatedRequests);
      },
    );

    const unsubscribeProposals = hiringController.subscribeToProposals(
      userId,
      userType,
      (updatedProposals) => {
        setProposals(updatedProposals);
      },
    );

    return () => {
      unsubscribeRequests();
      unsubscribeProposals();
      hiringController.cleanup();
    };
  }, [userId, userType, userEmail]);

  // Refetch on tab change via React Query
  useEffect(() => {
    if (activeTab === 'jobPostings') {
      jobPostingsQuery.refetch();
    } else if (activeTab === 'myApplications' && userEmail) {
      myApplicationsQuery.refetch();
    }
  }, [activeTab, userEmail]);

  const handlePickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];

        if (!file.name.toLowerCase().endsWith('.pdf')) {
          Alert.alert('Invalid File', 'Please select a PDF file (.pdf)');
          return;
        }

        if (file.size && file.size > 25 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Resume file must be less than 25MB');
          return;
        }

        setResumeFile(file);
        setErrorMessage(null);
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick resume file');
    }
  };

  const handleSubmitApplication = async () => {
    if (!selectedJobPosting || !resumeFile) {
      Alert.alert('Validation Error', 'Please select a PDF resume file');
      return;
    }

    if (!resumeFile.name.toLowerCase().endsWith('.pdf')) {
      Alert.alert('Invalid File', 'Please select a PDF file (.pdf)');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'User email is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let base64String = '';

      if (Platform.OS === 'web') {
        const fileUri = resumeFile.uri;
        const response = await fetch(fileUri);
        const blob = await response.blob();

        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            base64String = base64Data.split(',')[1];
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64String = await FileSystem.readAsStringAsync(resumeFile.uri, {
          encoding: 'base64' as any,
        });
      }

      const applicationData = {
        jobPostingId: selectedJobPosting.id,
        userEmail: userEmail,
        resumeFile: base64String,
        resumeFileName: resumeFile.name,
      };

      const data = await submitApplicationMutation.mutateAsync(applicationData);

      if (data.ok) {
        Alert.alert('Success', 'Application submitted successfully!');
        setShowApplyModal(false);
        setResumeFile(null);
        setSelectedJobPosting(null);
        setErrorMessage(null);
        setIsSubmitting(false);
        if (activeTab === 'jobPostings') {
          jobPostingsQuery.refetch();
        }
      } else {
        let errorMsg = 'Failed to submit application. Please try again.';

        if (data.error) {
          if (data.error.includes('already applied') || data.error.includes('duplicate')) {
            errorMsg = 'You have already applied to this job posting.';
          } else if (data.error.includes('PDF') || data.error.includes('pdf')) {
            errorMsg = 'Please upload a valid PDF file.';
          } else if (data.error.includes('required')) {
            errorMsg = 'Please fill in all required fields.';
          } else {
            errorMsg = data.error;
          }
        }

        setErrorMessage(errorMsg);
        Alert.alert('Submission Failed', errorMsg);
        setIsSubmitting(false);
      }
    } catch (error: any) {
      if (__DEV__) console.error('Error submitting application:', error);

      // Handle ApiError with specific status codes
      if (error instanceof ApiError) {
        if (error.status === 400) {
          const errorMsg = error.message || 'Please check your application details';
          setErrorMessage(errorMsg);
          Alert.alert('Validation Error', errorMsg);
          setIsSubmitting(false);
          return;
        } else if (error.status === 409) {
          const errorMsg = error.message || 'You have already applied to this job posting';
          setErrorMessage(errorMsg);
          Alert.alert('Already Applied', errorMsg);
          setIsSubmitting(false);
          return;
        } else if (error.status === 500) {
          const errorMsg = 'The server encountered an error. Please try again later.';
          setErrorMessage(errorMsg);
          Alert.alert('Server Error', errorMsg);
          setIsSubmitting(false);
          return;
        }
      }

      let errorMsg =
        'Failed to submit application. Please check your internet connection and try again.';

      if (error.message) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMsg = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMsg = 'Request timed out. Please try again.';
        }
      }

      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      setIsSubmitting(false);
    }
  };

  const handleCreateHiringRequest = async () => {
    if (
      !title ||
      !description ||
      !minBudget ||
      !maxBudget ||
      !startDate ||
      !endDate ||
      !city ||
      !state
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const requirementsList = requirements
      .split(',')
      .map((req) => req.trim())
      .filter((req) => req);
    const skillsList = skills
      .split(',')
      .map((skill) => skill.trim())
      .filter((skill) => skill);

    setLoading(true);
    const result = await hiringController.createHiringRequest({
      clientId: userId,
      title,
      description,
      serviceId: serviceId || undefined,
      eventId: eventId || undefined,
      budget: {
        min: parseFloat(minBudget),
        max: parseFloat(maxBudget),
        currency: 'PHP',
      },
      timeline: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isFlexible: false,
      },
      location: {
        type: locationType,
        address: address || undefined,
        city: city,
        state: state,
      },
      requirements: requirementsList,
      skillsRequired: skillsList,
      experienceLevel,
      contractType,
      status: HiringStatus.DRAFT,
    });

    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Hiring request created successfully!');
      setShowCreateForm(false);
      resetCreateForm();
      loadData();
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
    if (
      !proposalTitle ||
      !proposalDescription ||
      !proposedBudget ||
      !proposalStartDate ||
      !proposalEndDate ||
      !deliverables
    ) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedHiringRequest) {
      Alert.alert('Error', 'No hiring request selected');
      return;
    }

    const deliverablesList = deliverables
      .split(',')
      .map((del) => del.trim())
      .filter((del) => del);
    const termsList = terms
      .split(',')
      .map((term) => term.trim())
      .filter((term) => term);

    setLoading(true);
    const result = await hiringController.submitProposal({
      providerId: userId,
      hiringRequestId: selectedHiringRequest.id,
      title: proposalTitle,
      description: proposalDescription,
      proposedBudget: parseFloat(proposedBudget),
      timeline: {
        startDate: new Date(proposalStartDate),
        endDate: new Date(proposalEndDate),
      },
      deliverables: deliverablesList,
      terms: termsList,
      status: ProposalStatus.SUBMITTED,
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
    Alert.alert('Accept Proposal', 'Are you sure you want to accept this proposal?', [
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
        },
      },
    ]);
  };

  const handleRejectProposal = async (proposalId: string) => {
    Alert.prompt('Reject Proposal', 'Please provide a reason for rejection (optional):', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async (reason?: string) => {
          const result = await hiringController.rejectProposal(proposalId, reason);
          if (result.success) {
            Alert.alert('Success', 'Proposal rejected');
          } else {
            Alert.alert('Error', result.error || 'Failed to reject proposal');
          }
        },
      },
    ]);
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setServiceId('');
    setEventId('');
    setMinBudget('');
    setMaxBudget('');
    setStartDate('');
    setEndDate('');
    setCity('');
    setState('');
    setAddress('');
    setLocationType('on-site');
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

  const filteredHiringRequests = hiringRequests.filter((request) => {
    if (filterStatus !== 'all' && request.status !== filterStatus) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.title.toLowerCase().includes(query) ||
        request.description.toLowerCase().includes(query) ||
        request.location.city.toLowerCase().includes(query) ||
        request.location.state.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusColor = (status: HiringStatus | ProposalStatus): string => {
    switch (status) {
      case HiringStatus.DRAFT:
        return '#FFA500';
      case HiringStatus.OPEN:
        return '#4CAF50';
      case HiringStatus.IN_REVIEW:
        return '#2196F3';
      case HiringStatus.CLOSED:
        return '#9C27B0';
      case HiringStatus.CANCELLED:
        return '#F44336';
      case ProposalStatus.SUBMITTED:
        return '#FFA500';
      case ProposalStatus.UNDER_REVIEW:
        return '#2196F3';
      case ProposalStatus.ACCEPTED:
        return '#4CAF50';
      case ProposalStatus.REJECTED:
        return '#F44336';
      case ProposalStatus.REVISED:
        return '#FF9800';
      case ProposalStatus.WITHDRAWN:
        return '#757575';
      default:
        return '#757575';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `\u20B1${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  const closeApplyModal = () => {
    setShowApplyModal(false);
    setResumeFile(null);
    setSelectedJobPosting(null);
    setErrorMessage(null);
  };

  const openApplyModal = (job: any) => {
    setSelectedJobPosting(job);
    setShowApplyModal(true);
  };

  return {
    // Data
    hiringRequests,
    filteredHiringRequests,
    proposals,
    jobPostings,
    myApplications,
    bookings,
    loading,
    activeTab,
    showCreateForm,
    showProposalForm,
    showProposalsModal,
    selectedHiringRequest,
    showApplyModal,
    selectedJobPosting,
    resumeFile,
    isSubmitting,
    errorMessage,

    // Create form state
    title,
    setTitle,
    description,
    setDescription,
    serviceId,
    setServiceId,
    eventId,
    setEventId,
    minBudget,
    setMinBudget,
    maxBudget,
    setMaxBudget,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    city,
    setCity,
    state,
    setState,
    address,
    setAddress,
    locationType,
    setLocationType,
    requirements,
    setRequirements,
    skills,
    setSkills,
    experienceLevel,
    setExperienceLevel,
    contractType,
    setContractType,

    // Proposal form state
    proposalTitle,
    setProposalTitle,
    proposalDescription,
    setProposalDescription,
    proposedBudget,
    setProposedBudget,
    proposalStartDate,
    setProposalStartDate,
    proposalEndDate,
    setProposalEndDate,
    deliverables,
    setDeliverables,
    terms,
    setTerms,

    // Search / filter
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    jobPostingSearch,
    setJobPostingSearch,

    // Setters
    setActiveTab,
    setShowCreateForm,
    setShowProposalForm,
    setShowProposalsModal,
    setSelectedHiringRequest,
    setResumeFile,
    setErrorMessage,

    // Actions
    loadData,
    loadJobPostings,
    loadMyApplications,
    loadBookings,
    loadProposalsForRequest,
    handlePickResume,
    handleSubmitApplication,
    handleCreateHiringRequest,
    handlePublishHiringRequest,
    handleSubmitProposal,
    handleAcceptProposal,
    handleRejectProposal,
    resetCreateForm,
    resetProposalForm,
    openApplyModal,
    closeApplyModal,

    // Helpers
    getApplicationStatusColor,
    hasAppliedToJob,
    getApplicationStatusForJob,
    getStatusColor,
    formatCurrency,
    formatDate,
  };
}
