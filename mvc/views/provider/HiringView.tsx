import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SkeletonListItem } from '../../components/ui';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useJobPostings } from '../../hooks/useJobPostings';
import { useApplications } from '../../hooks/useApplications';
import { PostJobModal } from '../../components/hiring/PostJobModal';
import { InterviewModal } from '../../components/hiring/InterviewModal';
import { HireRejectModals } from '../../components/hiring/HireRejectModals';
import { ApplicationsTable } from '../../components/hiring/ApplicationsTable';
import { styles } from './HiringView.styles';

interface HiringViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

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

const renderProgressBar = (_status: string) => {
  // Progress bar removed - return null
  return null;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const HiringView: React.FC<HiringViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile } = useBreakpoints();
  const [activeTab, setActiveTab] = useState<'postings' | 'applications'>('postings');

  const jobPostingsHook = useJobPostings(user);
  const applicationsHook = useApplications(user, activeTab);

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
              jobPostingsHook.resetForm();
              jobPostingsHook.setShowPostModal(true);
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
              Applications ({applicationsHook.applications.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Filters - Only show for Job Postings */}
        {activeTab === 'postings' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {statusFilters.map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, jobPostingsHook.filterStatus === status && styles.filterChipActive]}
                onPress={() => jobPostingsHook.setFilterStatus(status)}
              >
                <Text style={[styles.filterChipText, jobPostingsHook.filterStatus === status && styles.filterChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {jobPostingsHook.loading && activeTab === 'postings' ? (
          <View style={{ padding: 16 }}>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        ) : activeTab === 'postings' ? (
          <>
            {jobPostingsHook.filteredJobPostings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💼</Text>
                <Text style={styles.emptyStateText}>No job postings found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {jobPostingsHook.filterStatus === 'all'
                    ? 'You don\'t have any job postings yet'
                    : `No ${jobPostingsHook.filterStatus} job postings`}
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
                    {jobPostingsHook.filteredJobPostings.map((job) => (
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
                            onPress={() => jobPostingsHook.handleEditJob(job)}
                          >
                            <Text style={styles.tableActionButtonText}>✏️ Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.deleteButton]}
                            onPress={() => jobPostingsHook.handleDeleteJob(job.id)}
                          >
                            <Text style={styles.tableActionButtonText}>🗑️ Delete</Text>
                          </TouchableOpacity>
                          {job.status !== 'expired' && (
                            <TouchableOpacity
                              style={[styles.tableActionButton, styles.toggleButton]}
                              onPress={() => jobPostingsHook.handleToggleStatus(job)}
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
                  {jobPostingsHook.filteredJobPostings.map((job) => (
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
                          onPress={() => jobPostingsHook.handleEditJob(job)}
                        >
                          <Text style={styles.tableActionButtonText}>✏️ Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.tableActionButton, styles.deleteButton]}
                          onPress={() => jobPostingsHook.handleDeleteJob(job.id)}
                        >
                          <Text style={styles.tableActionButtonText}>🗑️ Delete</Text>
                        </TouchableOpacity>
                        {job.status !== 'expired' && (
                          <TouchableOpacity
                            style={[styles.tableActionButton, styles.toggleButton]}
                            onPress={() => jobPostingsHook.handleToggleStatus(job)}
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
          <ApplicationsTable
            applications={applicationsHook.applications}
            isMobile={isMobile}
            formatDate={formatDate}
            getApplicationStatusColor={getApplicationStatusColor}
            renderProgressBar={renderProgressBar}
            isInterviewTimePassed={applicationsHook.isInterviewTimePassed}
            onDownloadResume={applicationsHook.handleDownloadResume}
            onScheduleInterview={applicationsHook.handleScheduleInterview}
            onHire={applicationsHook.handleHireApplication}
            onReject={applicationsHook.handleRejectApplication}
          />
        )}
      </ScrollView>

      {/* Post Job Modal */}
      <PostJobModal
        visible={jobPostingsHook.showPostModal}
        isEdit={false}
        jobTitle={jobPostingsHook.jobTitle}
        setJobTitle={jobPostingsHook.setJobTitle}
        description={jobPostingsHook.description}
        setDescription={jobPostingsHook.setDescription}
        deadlineDate={jobPostingsHook.deadlineDate}
        setDeadlineDate={jobPostingsHook.setDeadlineDate}
        jobType={jobPostingsHook.jobType}
        setJobType={jobPostingsHook.setJobType}
        isPostingJob={jobPostingsHook.isPostingJob}
        postJobError={jobPostingsHook.postJobError}
        setPostJobError={jobPostingsHook.setPostJobError}
        showSuccessToast={jobPostingsHook.showSuccessToast}
        showErrorToast={jobPostingsHook.showErrorToast}
        errorToastMessage={jobPostingsHook.errorToastMessage}
        toastOpacity={jobPostingsHook.toastOpacity}
        errorToastOpacity={jobPostingsHook.errorToastOpacity}
        showDeadlineDatePicker={jobPostingsHook.showDeadlineDatePicker}
        setShowDeadlineDatePicker={jobPostingsHook.setShowDeadlineDatePicker}
        onSubmit={jobPostingsHook.handlePostJob}
        onClose={() => {
          jobPostingsHook.setShowPostModal(false);
          jobPostingsHook.resetForm();
        }}
      />

      {/* Edit Job Modal */}
      <PostJobModal
        visible={jobPostingsHook.showEditModal}
        isEdit={true}
        jobTitle={jobPostingsHook.jobTitle}
        setJobTitle={jobPostingsHook.setJobTitle}
        description={jobPostingsHook.description}
        setDescription={jobPostingsHook.setDescription}
        deadlineDate={jobPostingsHook.deadlineDate}
        setDeadlineDate={jobPostingsHook.setDeadlineDate}
        jobType={jobPostingsHook.jobType}
        setJobType={jobPostingsHook.setJobType}
        isPostingJob={false}
        postJobError={null}
        setPostJobError={() => {}}
        showSuccessToast={false}
        showErrorToast={false}
        errorToastMessage=""
        toastOpacity={jobPostingsHook.toastOpacity}
        errorToastOpacity={jobPostingsHook.errorToastOpacity}
        showDeadlineDatePicker={jobPostingsHook.showDeadlineDatePicker}
        setShowDeadlineDatePicker={jobPostingsHook.setShowDeadlineDatePicker}
        onSubmit={jobPostingsHook.handleUpdateJob}
        onClose={() => {
          jobPostingsHook.setShowEditModal(false);
          jobPostingsHook.resetForm();
        }}
      />

      {/* Interview Modal */}
      <InterviewModal
        visible={applicationsHook.showInterviewModal}
        selectedApplication={applicationsHook.selectedApplication}
        interviewDate={applicationsHook.interviewDate}
        setInterviewDate={applicationsHook.setInterviewDate}
        interviewTime={applicationsHook.interviewTime}
        setInterviewTime={applicationsHook.setInterviewTime}
        interviewDescription={applicationsHook.interviewDescription}
        setInterviewDescription={applicationsHook.setInterviewDescription}
        showDatePicker={applicationsHook.showDatePicker}
        setShowDatePicker={applicationsHook.setShowDatePicker}
        showTimePicker={applicationsHook.showTimePicker}
        setShowTimePicker={applicationsHook.setShowTimePicker}
        errorMessage={applicationsHook.errorMessage}
        setErrorMessage={applicationsHook.setErrorMessage}
        showErrorTooltip={applicationsHook.showErrorTooltip}
        setShowErrorTooltip={applicationsHook.setShowErrorTooltip}
        successMessage={applicationsHook.successMessage}
        setSuccessMessage={applicationsHook.setSuccessMessage}
        showSuccessTooltip={applicationsHook.showSuccessTooltip}
        setShowSuccessTooltip={applicationsHook.setShowSuccessTooltip}
        formatDate={formatDate}
        onSubmit={applicationsHook.handleSubmitInterview}
        onClose={() => {
          applicationsHook.setShowInterviewModal(false);
          applicationsHook.setSelectedApplication(null);
          applicationsHook.setInterviewDate('');
          applicationsHook.setInterviewTime('');
          applicationsHook.setInterviewDescription('');
        }}
      />

      {/* Hire/Reject Modals */}
      <HireRejectModals
        showHireModal={applicationsHook.showHireModal}
        hireNote={applicationsHook.hireNote}
        setHireNote={applicationsHook.setHireNote}
        onSubmitHire={applicationsHook.handleSubmitHire}
        onCloseHire={() => {
          applicationsHook.setShowHireModal(false);
          applicationsHook.setSelectedApplication(null);
          applicationsHook.setHireNote('');
        }}
        showRejectModal={applicationsHook.showRejectModal}
        rejectionNote={applicationsHook.rejectionNote}
        setRejectionNote={applicationsHook.setRejectionNote}
        onSubmitReject={applicationsHook.handleSubmitRejection}
        onCloseReject={() => {
          applicationsHook.setShowRejectModal(false);
          applicationsHook.setSelectedApplication(null);
          applicationsHook.setRejectionNote('');
        }}
        selectedApplication={applicationsHook.selectedApplication}
      />
    </AppLayout>
  );
};
