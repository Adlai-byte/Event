import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { HiringController } from '../../controllers/HiringController';
import { HiringRequest, HiringStatus, Proposal, ProposalStatus, ExperienceLevel, ContractType } from '../../models/Hiring';
import { getApiBaseUrl } from '../../services/api';

const { width, height } = Dimensions.get('window');

interface HiringViewProps {
  userId: string;
  userEmail?: string;
  userType: 'client' | 'provider';
  onBack: () => void;
}

interface Booking {
  idbooking: number;
  b_event_name: string;
  b_event_date: string;
  b_start_time: string;
  b_end_time: string;
  b_location: string;
}

export const HiringView: React.FC<HiringViewProps> = ({ userId, userEmail, userType, onBack }) => {
  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proposals' | 'jobPostings' | 'myApplications'>('jobPostings');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [showProposalsModal, setShowProposalsModal] = useState(false);
  const [selectedHiringRequest, setSelectedHiringRequest] = useState<HiringRequest | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'reviewed': return '#3b82f6';
      case 'accepted': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#64748b';
    }
  };

  const loadMyApplications = async () => {
    if (!userEmail) return;
    
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/user/job-applications?userEmail=${encodeURIComponent(userEmail)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.applications) {
          setMyApplications(data.applications);
        }
      }
    } catch (error) {
      console.error('Error loading my applications:', error);
    }
  };

  useEffect(() => {
    loadData();
    if (userType === 'client' && userEmail) {
      loadBookings();
    }
    
    // Subscribe to real-time updates
    const unsubscribeRequests = hiringController.subscribeToHiringRequests(
      userId,
      userType,
      (updatedRequests) => {
        setHiringRequests(updatedRequests);
      }
    );

    const unsubscribeProposals = hiringController.subscribeToProposals(
      userId,
      userType,
      (updatedProposals) => {
        setProposals(updatedProposals);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeProposals();
      hiringController.cleanup();
    };
  }, [userId, userType, userEmail]);

  useEffect(() => {
    if (activeTab === 'jobPostings') {
      loadJobPostings();
    } else if (activeTab === 'myApplications' && userEmail) {
      loadMyApplications();
    }
  }, [activeTab, userEmail]);

  const loadData = async () => {
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

    // Load provider job postings
    await loadJobPostings();

    setLoading(false);
  };

  const loadJobPostings = async () => {
    try {
      const url = `${getApiBaseUrl()}/api/job-postings?status=active${jobPostingSearch ? `&search=${encodeURIComponent(jobPostingSearch)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.ok && data.jobPostings) {
        setJobPostings(data.jobPostings);
      }
    } catch (error) {
      console.error('Error loading job postings:', error);
    }
  };

  const handlePickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file is PDF
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          Alert.alert('Invalid File', 'Please select a PDF file (.pdf)');
          return;
        }

        // Check file size (25MB limit)
        if (file.size && file.size > 25 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Resume file must be less than 25MB');
          return;
        }

        setResumeFile(file);
        setErrorMessage(null); // Clear error when new file is selected
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick resume file');
    }
  };

  const handleSubmitApplication = async () => {
    if (!selectedJobPosting || !resumeFile) {
      Alert.alert('Validation Error', 'Please select a PDF resume file');
      return;
    }

    // Validate file is PDF
    if (!resumeFile.name.toLowerCase().endsWith('.pdf')) {
      Alert.alert('Invalid File', 'Please select a PDF file (.pdf)');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'User email is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null); // Clear any previous errors

    try {
      let base64String = '';

      if (Platform.OS === 'web') {
        // Web: Use FileReader
        const fileUri = resumeFile.uri;
        const response = await fetch(fileUri);
        const blob = await response.blob();
        
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            base64String = base64Data.split(',')[1]; // Remove data:application/pdf;base64, prefix
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Mobile: Use FileSystem to read the file as base64
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

      const apiResponse = await fetch(`${getApiBaseUrl()}/api/job-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });

      if (!apiResponse.ok) {
        // Handle HTTP errors
        if (apiResponse.status === 400) {
          const errorData = await apiResponse.json().catch(() => ({ error: 'Invalid request' }));
          const errorMsg = errorData.error || 'Please check your application details';
          setErrorMessage(errorMsg);
          Alert.alert('Validation Error', errorMsg);
          setIsSubmitting(false);
          return;
        } else if (apiResponse.status === 409) {
          const errorData = await apiResponse.json().catch(() => ({ error: 'Already applied' }));
          const errorMsg = errorData.error || 'You have already applied to this job posting';
          setErrorMessage(errorMsg);
          Alert.alert('Already Applied', errorMsg);
          setIsSubmitting(false);
          return;
        } else if (apiResponse.status === 500) {
          const errorMsg = 'The server encountered an error. Please try again later.';
          setErrorMessage(errorMsg);
          Alert.alert('Server Error', errorMsg);
          setIsSubmitting(false);
          return;
        }
      }

      const data = await apiResponse.json();

      if (data.ok) {
        Alert.alert(
          'Application Submitted Successfully! 🎉',
          `Your application for "${selectedJobPosting.jobTitle}" has been submitted successfully. The provider will review your application and contact you if you're selected.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowApplyModal(false);
                setResumeFile(null);
                setSelectedJobPosting(null);
                setIsSubmitting(false);
                // Reload job postings to update application status
                if (activeTab === 'jobPostings') {
                  loadJobPostings();
                }
              }
            }
          ]
        );
      } else {
        // Handle specific error messages
        let errorMessage = 'Failed to submit application. Please try again.';
        
        if (data.error) {
          if (data.error.includes('already applied') || data.error.includes('duplicate')) {
            errorMessage = 'You have already applied to this job posting.';
          } else if (data.error.includes('PDF') || data.error.includes('pdf')) {
            errorMessage = 'Please upload a valid PDF file.';
          } else if (data.error.includes('required')) {
            errorMessage = 'Please fill in all required fields.';
          } else {
            errorMessage = data.error;
          }
        }
        
        setErrorMessage(errorMessage);
        Alert.alert('Submission Failed', errorMessage);
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      
      let errorMessage = 'Failed to submit application. Please check your internet connection and try again.';
      
      if (error.message) {
        if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        }
      }
      
      setErrorMessage(errorMessage);
      Alert.alert('Error', errorMessage);
      setIsSubmitting(false);
    }
  };

  const loadBookings = async () => {
    if (!userEmail) return;
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/user/bookings?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.ok && data.rows) {
        setBookings(data.rows.map((b: any) => ({
          idbooking: b.idbooking,
          b_event_name: b.b_event_name,
          b_event_date: b.b_event_date,
          b_start_time: b.b_start_time,
          b_end_time: b.b_end_time,
          b_location: b.b_location
        })));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadProposalsForRequest = async (hiringRequestId: string) => {
    try {
      const result = await hiringController.getHiringRequestProposals(hiringRequestId);
      if (result.success && result.proposals) {
        setProposals(result.proposals);
        setShowProposalsModal(true);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  const handleCreateHiringRequest = async () => {
    if (!title || !description || !minBudget || !maxBudget || !startDate || !endDate || !city || !state) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const requirementsList = requirements.split(',').map(req => req.trim()).filter(req => req);
    const skillsList = skills.split(',').map(skill => skill.trim()).filter(skill => skill);

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
        currency: 'PHP'
      },
      timeline: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isFlexible: false
      },
      location: {
        type: locationType,
        address: address || undefined,
        city: city,
        state: state
      },
      requirements: requirementsList,
      skillsRequired: skillsList,
      experienceLevel,
      contractType,
      status: HiringStatus.DRAFT
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
    if (!proposalTitle || !proposalDescription || !proposedBudget || !proposalStartDate || !proposalEndDate || !deliverables) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedHiringRequest) {
      Alert.alert('Error', 'No hiring request selected');
      return;
    }

    const deliverablesList = deliverables.split(',').map(del => del.trim()).filter(del => del);
    const termsList = terms.split(',').map(term => term.trim()).filter(term => term);

    setLoading(true);
    const result = await hiringController.submitProposal({
      providerId: userId,
      hiringRequestId: selectedHiringRequest.id,
      title: proposalTitle,
      description: proposalDescription,
      proposedBudget: parseFloat(proposedBudget),
      timeline: {
        startDate: new Date(proposalStartDate),
        endDate: new Date(proposalEndDate)
      },
      deliverables: deliverablesList,
      terms: termsList,
      status: ProposalStatus.SUBMITTED
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
    Alert.alert(
      'Accept Proposal',
      'Are you sure you want to accept this proposal?',
      [
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
          }
        }
      ]
    );
  };

  const handleRejectProposal = async (proposalId: string) => {
    Alert.prompt(
      'Reject Proposal',
      'Please provide a reason for rejection (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            const result = await hiringController.rejectProposal(proposalId, reason);
            if (result.success) {
              Alert.alert('Success', 'Proposal rejected');
            } else {
              Alert.alert('Error', result.error || 'Failed to reject proposal');
            }
          }
        }
      ]
    );
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

  const filteredHiringRequests = hiringRequests.filter(request => {
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

  const getStatusColor = (status: HiringStatus | ProposalStatus): string => {
    switch (status) {
      case HiringStatus.DRAFT: return '#FFA500';
      case HiringStatus.OPEN: return '#4CAF50';
      case HiringStatus.IN_REVIEW: return '#2196F3';
      case HiringStatus.CLOSED: return '#9C27B0';
      case HiringStatus.CANCELLED: return '#F44336';
      case ProposalStatus.SUBMITTED: return '#FFA500';
      case ProposalStatus.UNDER_REVIEW: return '#2196F3';
      case ProposalStatus.ACCEPTED: return '#4CAF50';
      case ProposalStatus.REJECTED: return '#F44336';
      case ProposalStatus.REVISED: return '#FF9800';
      case ProposalStatus.WITHDRAWN: return '#757575';
      default: return '#757575';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  if (loading && hiringRequests.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Job Postings
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'jobPostings' && styles.activeTab]}
          onPress={() => {
            setActiveTab('jobPostings');
            loadJobPostings();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'jobPostings' && styles.activeTabText]}>
            Job Postings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myApplications' && styles.activeTab]}
          onPress={() => setActiveTab('myApplications')}
        >
          <Text style={[styles.tabText, activeTab === 'myApplications' && styles.activeTabText]}>
            My Applications
          </Text>
        </TouchableOpacity>
        {userType === 'provider' && (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'proposals' && styles.activeTab]}
          onPress={() => setActiveTab('proposals')}
        >
          <Text style={[styles.tabText, activeTab === 'proposals' && styles.activeTabText]}>
            My Proposals
          </Text>
        </TouchableOpacity>
        )}
      </View>

      {/* Filters and Search */}
      {activeTab === 'jobPostings' && (
        <View style={styles.filterContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search job postings..."
            value={jobPostingSearch}
            onChangeText={(text) => {
              setJobPostingSearch(text);
              // Debounce search
              setTimeout(() => {
                loadJobPostings();
              }, 500);
            }}
          />
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'myApplications' ? (
          // My Applications
          <>
            {myApplications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>📋</Text>
                <Text style={styles.emptyStateText}>No applications yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Apply to job postings to see your applications here
                </Text>
              </View>
            ) : (
              myApplications.map((app) => (
                <View key={app.id} style={styles.applicationCard}>
                  <View style={styles.applicationHeader}>
                    <View style={styles.applicationHeaderLeft}>
                      <Text style={styles.applicationJobTitle}>{app.jobTitle}</Text>
                      <Text style={styles.applicationProvider}>
                        {app.providerFirstName && app.providerLastName
                          ? `${app.providerFirstName} ${app.providerLastName}`
                          : 'Provider'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getApplicationStatusColor(app.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getApplicationStatusColor(app.status) }]}>
                        {app.status.toUpperCase()}
                      </Text>
                  </View>
                </View>
                
                  <View style={styles.applicationDetails}>
                    <Text style={styles.applicationDetailLabel}>Applied:</Text>
                    <Text style={styles.applicationDetailValue}>
                      {new Date(app.appliedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                  </Text>
                </View>

                  {app.interviewDate && app.interviewTime && (
                    <View style={styles.applicationDetails}>
                      <Text style={styles.applicationDetailLabel}>Interview Scheduled:</Text>
                      <Text style={styles.applicationDetailValue}>
                        {new Date(app.interviewDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {app.interviewTime}
                      </Text>
                  </View>
                )}

                  {app.rejectionNote && (
                    <View style={styles.rejectionNoteContainer}>
                      <Text style={styles.rejectionNoteLabel}>Rejection Note:</Text>
                      <Text style={styles.rejectionNoteText}>{app.rejectionNote}</Text>
                    </View>
                  )}

                  <View style={styles.applicationDescription}>
                    <Text style={styles.applicationDescriptionText} numberOfLines={3}>
                      {app.jobDescription}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : activeTab === 'jobPostings' ? (
          // Job Postings
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={styles.loadingText}>Loading job postings...</Text>
              </View>
            ) : jobPostings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>💼</Text>
                <Text style={styles.emptyStateText}>No job postings available</Text>
                <Text style={styles.emptyStateSubtext}>
                  Check back later for new job opportunities
                </Text>
              </View>
            ) : (
              jobPostings.map((job) => (
                <View key={job.id} style={styles.jobPostingCard}>
                  <View style={styles.jobPostingHeader}>
                    <View style={styles.jobPostingHeaderLeft}>
                      <Text style={styles.jobPostingTitle}>{job.jobTitle}</Text>
                      {job.providerFirstName && job.providerLastName && (
                        <Text style={styles.jobPostingProvider}>
                          by {job.providerFirstName} {job.providerLastName}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#10b98120' }]}>
                      <Text style={[styles.statusText, { color: '#10b981' }]}>
                        {job.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.jobPostingDescription}>{job.description}</Text>
                  
                  <View style={styles.jobPostingFooter}>
                    <Text style={styles.jobPostingDeadline}>
                      📅 Deadline: {new Date(job.deadlineDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.jobPostingDate}>
                      Posted: {new Date(job.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => {
                      setSelectedJobPosting(job);
                      setShowApplyModal(true);
                    }}
                  >
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                  </TouchableOpacity>
              </View>
              ))
            )}
          </>
        ) : (
          // Proposals
          <>
            {proposals.map((proposal) => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <Text style={styles.proposalTitle}>{proposal.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) }]}>
                    <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
                  </View>
                </View>
                
                <Text style={styles.proposalDescription}>{proposal.description}</Text>
                
                <View style={styles.proposalDetails}>
                  <Text style={styles.proposalDetail}>
                    Budget: {formatCurrency(proposal.proposedBudget)}
                  </Text>
                  <Text style={styles.proposalDetail}>
                    Timeline: {formatDate(proposal.timeline.startDate)} - {formatDate(proposal.timeline.endDate)}
                  </Text>
                </View>

                {proposal.deliverables.length > 0 && (
                  <View style={styles.deliverablesContainer}>
                    <Text style={styles.deliverablesTitle}>Deliverables:</Text>
                    {proposal.deliverables.map((del, index) => (
                      <Text key={index} style={styles.deliverableItem}>• {del}</Text>
                    ))}
                  </View>
                )}

                {proposal.clientFeedback && (
                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackTitle}>Client Feedback:</Text>
                    <Text style={styles.feedbackText}>{proposal.clientFeedback}</Text>
                  </View>
                )}
              </View>
            ))}

            {proposals.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No proposals yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Submit proposals to available jobs to get started
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Hiring Request Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateForm(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Hiring Request</Text>
            <TouchableOpacity onPress={handleCreateHiringRequest}>
              <Text style={styles.modalSaveButton}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter job title"
            />

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the job requirements"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Service ID (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={serviceId}
              onChangeText={setServiceId}
              placeholder="Enter service ID"
            />

            {userType === 'client' && bookings.length > 0 && (
              <>
                <Text style={styles.formLabel}>Link to Event (Optional)</Text>
                <ScrollView style={styles.eventSelector} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.eventOption, !eventId && styles.eventOptionSelected]}
                    onPress={() => setEventId('')}
                  >
                    <Text style={styles.eventOptionText}>None</Text>
                  </TouchableOpacity>
                  {bookings.map((booking) => (
                    <TouchableOpacity
                      key={booking.idbooking}
                      style={[
                        styles.eventOption,
                        eventId === booking.idbooking.toString() && styles.eventOptionSelected
                      ]}
                      onPress={() => setEventId(booking.idbooking.toString())}
                    >
                      <Text style={styles.eventOptionText}>{booking.b_event_name}</Text>
                      <Text style={styles.eventOptionDate}>
                        {new Date(booking.b_event_date).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.budgetContainer}>
              <View style={styles.budgetInput}>
                <Text style={styles.formLabel}>Min Budget *</Text>
                <TextInput
                  style={styles.formInput}
                  value={minBudget}
                  onChangeText={setMinBudget}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.budgetInput}>
                <Text style={styles.formLabel}>Max Budget *</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxBudget}
                  onChangeText={setMaxBudget}
                  placeholder="1000"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>Start Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>End Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Location *</Text>
            <View style={styles.locationTypeContainer}>
              {(['remote', 'on-site', 'hybrid'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.locationTypeButton,
                    locationType === type && styles.locationTypeButtonActive
                  ]}
                  onPress={() => setLocationType(type)}
                >
                  <Text style={[
                    styles.locationTypeText,
                    locationType === type && styles.locationTypeTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>City *</Text>
            <TextInput
              style={styles.formInput}
              value={city}
              onChangeText={setCity}
              placeholder="Enter city"
            />

            <Text style={styles.formLabel}>State/Province *</Text>
            <TextInput
              style={styles.formInput}
              value={state}
              onChangeText={setState}
              placeholder="Enter state or province"
            />

            <Text style={styles.formLabel}>Address (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter full address"
            />

            <Text style={styles.formLabel}>Requirements (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={requirements}
              onChangeText={setRequirements}
              placeholder="Requirement 1, Requirement 2, ..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Required Skills (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={skills}
              onChangeText={setSkills}
              placeholder="Skill 1, Skill 2, ..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Create Proposal Modal */}
      <Modal
        visible={showProposalForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProposalForm(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Proposal</Text>
            <TouchableOpacity onPress={handleSubmitProposal}>
              <Text style={styles.modalSaveButton}>Submit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Proposal Title *</Text>
            <TextInput
              style={styles.formInput}
              value={proposalTitle}
              onChangeText={setProposalTitle}
              placeholder="Enter proposal title"
            />

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={proposalDescription}
              onChangeText={setProposalDescription}
              placeholder="Describe your approach and qualifications"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Proposed Budget *</Text>
            <TextInput
              style={styles.formInput}
              value={proposedBudget}
              onChangeText={setProposedBudget}
              placeholder="1000"
              keyboardType="numeric"
            />

            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>Start Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={proposalStartDate}
                  onChangeText={setProposalStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>End Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={proposalEndDate}
                  onChangeText={setProposalEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Deliverables * (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={deliverables}
              onChangeText={setDeliverables}
              placeholder="Deliverable 1, Deliverable 2, ..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Terms (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={terms}
              onChangeText={setTerms}
              placeholder="Term 1, Term 2, ..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* View Proposals Modal */}
      <Modal
        visible={showProposalsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProposalsModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Proposals for {selectedHiringRequest?.title}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.formContainer}>
            {proposals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No proposals yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Proposals will appear here when providers submit them
                </Text>
              </View>
            ) : (
              proposals.map((proposal) => (
                <View key={proposal.id} style={styles.proposalCard}>
                  <View style={styles.proposalHeader}>
                    <Text style={styles.proposalTitle}>{proposal.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(proposal.status) }]}>
                      <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.proposalDescription}>{proposal.description}</Text>
                  
                  <View style={styles.proposalDetails}>
                    <Text style={styles.proposalDetail}>
                      Budget: {formatCurrency(proposal.proposedBudget)}
                    </Text>
                    <Text style={styles.proposalDetail}>
                      Timeline: {formatDate(proposal.timeline.startDate)} - {formatDate(proposal.timeline.endDate)}
                    </Text>
                  </View>

                  {proposal.deliverables.length > 0 && (
                    <View style={styles.deliverablesContainer}>
                      <Text style={styles.deliverablesTitle}>Deliverables:</Text>
                      {proposal.deliverables.map((del, index) => (
                        <Text key={index} style={styles.deliverableItem}>• {del}</Text>
                      ))}
                    </View>
                  )}

                  {proposal.status === ProposalStatus.SUBMITTED && userType === 'client' && (
                    <View style={styles.proposalActions}>
                      <TouchableOpacity
                        onPress={() => handleAcceptProposal(proposal.id, proposal.hiringRequestId)}
                        style={styles.acceptButton}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRejectProposal(proposal.id)}
                        style={styles.rejectButton}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Apply to Job Modal */}
      <Modal
        visible={showApplyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowApplyModal(false);
          setResumeFile(null);
          setSelectedJobPosting(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply to Job</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowApplyModal(false);
                  setResumeFile(null);
                  setSelectedJobPosting(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedJobPosting && (
              <View style={styles.jobInfoContainer}>
                <Text style={styles.jobInfoTitle}>{selectedJobPosting.jobTitle}</Text>
                <Text style={styles.jobInfoDescription}>{selectedJobPosting.description}</Text>
                <Text style={styles.jobInfoDeadline}>
                  Deadline: {new Date(selectedJobPosting.deadlineDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Resume (PDF File) *</Text>
                <Text style={styles.helperText}>Please upload your resume in PDF format</Text>
                <TouchableOpacity
                  style={styles.filePickerButton}
                  onPress={handlePickResume}
                  disabled={isSubmitting}
                >
                  <Text style={styles.filePickerButtonText}>
                    {resumeFile ? `📄 ${resumeFile.name}` : '📎 Select PDF Resume'}
                  </Text>
                </TouchableOpacity>
                {resumeFile && (
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => {
                      setResumeFile(null);
                      setErrorMessage(null); // Clear error when file is removed
                    }}
                  >
                    <Text style={styles.removeFileButtonText}>Remove File</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Error Message Display */}
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                  <TouchableOpacity
                    onPress={() => setErrorMessage(null)}
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
                  setShowApplyModal(false);
                  setResumeFile(null);
                  setSelectedJobPosting(null);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitApplication}
                disabled={isSubmitting || !resumeFile}
              >
                {isSubmitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C63FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  addButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6C63FF',
  },
  tabText: {
    fontSize: 16,
    color: '#636E72',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    }),
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestDescription: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestDetail: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  requirementsContainer: {
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  requirementItem: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  proposeButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  proposeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    }),
  },
  jobPostingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    }),
  },
  jobPostingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobPostingHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  jobPostingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  jobPostingProvider: {
    fontSize: 14,
    color: '#636E72',
  },
  jobPostingDescription: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobPostingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  jobPostingDeadline: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  jobPostingDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  applyButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#636E72',
  },
  jobInfoContainer: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  jobInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  jobInfoDescription: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  jobInfoDeadline: {
    fontSize: 12,
    color: '#636E72',
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
    color: '#2D3436',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  filePickerButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  filePickerButtonText: {
    fontSize: 14,
    color: '#636E72',
  },
  removeFileButton: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  removeFileButtonText: {
    fontSize: 12,
    color: '#E74C3C',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    color: '#636E72',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  proposalDescription: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    lineHeight: 20,
  },
  proposalDetails: {
    marginBottom: 12,
  },
  proposalDetail: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  deliverablesContainer: {
    marginBottom: 12,
  },
  deliverablesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  deliverableItem: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  feedbackContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#636E72',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#A4B0BE',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetInput: {
    flex: 1,
    marginRight: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  filterChipActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventSelector: {
    maxHeight: 150,
    marginBottom: 16,
  },
  eventOption: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  eventOptionSelected: {
    backgroundColor: '#E8E5FF',
    borderColor: '#6C63FF',
  },
  eventOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  eventOptionDate: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  locationTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  locationTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  locationTypeButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  locationTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
  },
  locationTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewProposalsButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewProposalsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    } : {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  applicationHeaderLeft: {
    flex: 1,
  },
  applicationJobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  applicationProvider: {
    fontSize: 14,
    color: '#64748B',
  },
  applicationDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  applicationDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 8,
  },
  applicationDetailValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  rejectionNoteContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  rejectionNoteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  rejectionNoteText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  applicationDescription: {
    marginTop: 8,
  },
  applicationDescriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});


