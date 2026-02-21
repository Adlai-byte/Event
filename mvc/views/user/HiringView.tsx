import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SkeletonListItem } from '../../components/ui';
import { ProposalStatus } from '../../models/Hiring';
import { AppLayout } from '../../components/layout';
import { JobPostingsList, ApplyModal, MyApplicationsList } from '../../components/hiring';
import { useUserHiring } from '../../hooks/useUserHiring';
import { styles } from './HiringView.styles';

interface HiringViewProps {
  userId: string;
  userEmail?: string;
  userType: 'client' | 'provider';
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const HiringView: React.FC<HiringViewProps> = ({ userId, userEmail, userType, user, onNavigate, onLogout }) => {
  const h = useUserHiring({ userId, userEmail, userType });

  if (h.loading && h.hiringRequests.length === 0) {
    return (
      <AppLayout role="user" activeRoute="hiring" title="Hiring" user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={{ padding: 16 }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="user" activeRoute="hiring" title="Hiring" user={user} onNavigate={onNavigate} onLogout={onLogout}>
    <View style={styles.container}>
      {/* Modern Tabs */}
      <View style={styles.modernTabContainer}>
        <TouchableOpacity
          style={[styles.modernTab, h.activeTab === 'jobPostings' && styles.modernActiveTab]}
          onPress={() => {
            h.setActiveTab('jobPostings');
            h.loadJobPostings();
          }}
        >
          <Text style={[styles.modernTabText, h.activeTab === 'jobPostings' && styles.modernActiveTabText]}>
            Job Postings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modernTab, h.activeTab === 'myApplications' && styles.modernActiveTab]}
          onPress={() => h.setActiveTab('myApplications')}
        >
          <Text style={[styles.modernTabText, h.activeTab === 'myApplications' && styles.modernActiveTabText]}>
            My Applications
          </Text>
        </TouchableOpacity>
        {userType === 'provider' && (
        <TouchableOpacity
            style={[styles.modernTab, h.activeTab === 'proposals' && styles.modernActiveTab]}
          onPress={() => h.setActiveTab('proposals')}
        >
            <Text style={[styles.modernTabText, h.activeTab === 'proposals' && styles.modernActiveTabText]}>
            My Proposals
          </Text>
        </TouchableOpacity>
        )}
      </View>

      {/* Modern Search Bar */}
      {h.activeTab === 'jobPostings' && (
        <View style={styles.modernSearchContainer}>
          <View style={styles.modernSearchWrapper}>
            <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
              style={styles.modernSearchInput}
            placeholder="Search job postings..."
              placeholderTextColor="#94a3b8"
            value={h.jobPostingSearch}
            onChangeText={(text) => {
              h.setJobPostingSearch(text);
              setTimeout(() => {
                h.loadJobPostings();
              }, 500);
            }}
              onSubmitEditing={() => h.loadJobPostings()}
              returnKeyType="search"
            />
            {h.jobPostingSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  h.setJobPostingSearch('');
                  h.loadJobPostings();
                }}
                style={styles.clearSearchButton}
              >
                <Text style={styles.clearSearchText}>{'\u2715'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content}>
        {h.activeTab === 'myApplications' ? (
          <MyApplicationsList
            myApplications={h.myApplications}
            getApplicationStatusColor={h.getApplicationStatusColor}
          />
        ) : h.activeTab === 'jobPostings' ? (
          <JobPostingsList
            jobPostings={h.jobPostings}
            loading={h.loading}
            hasAppliedToJob={h.hasAppliedToJob}
            getApplicationStatusForJob={h.getApplicationStatusForJob}
            getApplicationStatusColor={h.getApplicationStatusColor}
            onApply={h.openApplyModal}
          />
        ) : (
          /* Proposals */
          <>
            {h.proposals.map((proposal) => (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <Text style={styles.proposalTitle}>{proposal.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: h.getStatusColor(proposal.status) }]}>
                    <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.proposalDescription}>{proposal.description}</Text>

                <View style={styles.proposalDetails}>
                  <Text style={styles.proposalDetail}>
                    Budget: {h.formatCurrency(proposal.proposedBudget)}
                  </Text>
                  <Text style={styles.proposalDetail}>
                    Timeline: {h.formatDate(proposal.timeline.startDate)} - {h.formatDate(proposal.timeline.endDate)}
                  </Text>
                </View>

                {proposal.deliverables.length > 0 && (
                  <View style={styles.deliverablesContainer}>
                    <Text style={styles.deliverablesTitle}>Deliverables:</Text>
                    {proposal.deliverables.map((del, index) => (
                      <Text key={index} style={styles.deliverableItem}>{'\u2022'} {del}</Text>
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

            {h.proposals.length === 0 && (
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
        visible={h.showCreateForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => h.setShowCreateForm(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Hiring Request</Text>
            <TouchableOpacity onPress={h.handleCreateHiringRequest}>
              <Text style={styles.modalSaveButton}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              value={h.title}
              onChangeText={h.setTitle}
              placeholder="Enter job title"
            />

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={h.description}
              onChangeText={h.setDescription}
              placeholder="Describe the job requirements"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Service ID (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={h.serviceId}
              onChangeText={h.setServiceId}
              placeholder="Enter service ID"
            />

            {userType === 'client' && h.bookings.length > 0 && (
              <>
                <Text style={styles.formLabel}>Link to Event (Optional)</Text>
                <ScrollView style={styles.eventSelector} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.eventOption, !h.eventId && styles.eventOptionSelected]}
                    onPress={() => h.setEventId('')}
                  >
                    <Text style={styles.eventOptionText}>None</Text>
                  </TouchableOpacity>
                  {h.bookings.map((booking) => (
                    <TouchableOpacity
                      key={booking.idbooking}
                      style={[
                        styles.eventOption,
                        h.eventId === booking.idbooking.toString() && styles.eventOptionSelected
                      ]}
                      onPress={() => h.setEventId(booking.idbooking.toString())}
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
                  value={h.minBudget}
                  onChangeText={h.setMinBudget}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.budgetInput}>
                <Text style={styles.formLabel}>Max Budget *</Text>
                <TextInput
                  style={styles.formInput}
                  value={h.maxBudget}
                  onChangeText={h.setMaxBudget}
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
                  value={h.startDate}
                  onChangeText={h.setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>End Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={h.endDate}
                  onChangeText={h.setEndDate}
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
                    h.locationType === type && styles.locationTypeButtonActive
                  ]}
                  onPress={() => h.setLocationType(type)}
                >
                  <Text style={[
                    styles.locationTypeText,
                    h.locationType === type && styles.locationTypeTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>City *</Text>
            <TextInput
              style={styles.formInput}
              value={h.city}
              onChangeText={h.setCity}
              placeholder="Enter city"
            />

            <Text style={styles.formLabel}>State/Province *</Text>
            <TextInput
              style={styles.formInput}
              value={h.state}
              onChangeText={h.setState}
              placeholder="Enter state or province"
            />

            <Text style={styles.formLabel}>Address (Optional)</Text>
            <TextInput
              style={styles.formInput}
              value={h.address}
              onChangeText={h.setAddress}
              placeholder="Enter full address"
            />

            <Text style={styles.formLabel}>Requirements (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={h.requirements}
              onChangeText={h.setRequirements}
              placeholder="Requirement 1, Requirement 2, ..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Required Skills (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={h.skills}
              onChangeText={h.setSkills}
              placeholder="Skill 1, Skill 2, ..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Create Proposal Modal */}
      <Modal
        visible={h.showProposalForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => h.setShowProposalForm(false)}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Proposal</Text>
            <TouchableOpacity onPress={h.handleSubmitProposal}>
              <Text style={styles.modalSaveButton}>Submit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Proposal Title *</Text>
            <TextInput
              style={styles.formInput}
              value={h.proposalTitle}
              onChangeText={h.setProposalTitle}
              placeholder="Enter proposal title"
            />

            <Text style={styles.formLabel}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={h.proposalDescription}
              onChangeText={h.setProposalDescription}
              placeholder="Describe your approach and qualifications"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.formLabel}>Proposed Budget *</Text>
            <TextInput
              style={styles.formInput}
              value={h.proposedBudget}
              onChangeText={h.setProposedBudget}
              placeholder="1000"
              keyboardType="numeric"
            />

            <View style={styles.dateContainer}>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>Start Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={h.proposalStartDate}
                  onChangeText={h.setProposalStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.dateInput}>
                <Text style={styles.formLabel}>End Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={h.proposalEndDate}
                  onChangeText={h.setProposalEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Deliverables * (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={h.deliverables}
              onChangeText={h.setDeliverables}
              placeholder="Deliverable 1, Deliverable 2, ..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.formLabel}>Terms (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, styles.textAreaInput]}
              value={h.terms}
              onChangeText={h.setTerms}
              placeholder="Term 1, Term 2, ..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* View Proposals Modal */}
      <Modal
        visible={h.showProposalsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => h.setShowProposalsModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Proposals for {h.selectedHiringRequest?.title}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.formContainer}>
            {h.proposals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No proposals yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Proposals will appear here when providers submit them
                </Text>
              </View>
            ) : (
              h.proposals.map((proposal) => (
                <View key={proposal.id} style={styles.proposalCard}>
                  <View style={styles.proposalHeader}>
                    <Text style={styles.proposalTitle}>{proposal.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: h.getStatusColor(proposal.status) }]}>
                      <Text style={styles.statusText}>{proposal.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.proposalDescription}>{proposal.description}</Text>

                  <View style={styles.proposalDetails}>
                    <Text style={styles.proposalDetail}>
                      Budget: {h.formatCurrency(proposal.proposedBudget)}
                    </Text>
                    <Text style={styles.proposalDetail}>
                      Timeline: {h.formatDate(proposal.timeline.startDate)} - {h.formatDate(proposal.timeline.endDate)}
                    </Text>
                  </View>

                  {proposal.deliverables.length > 0 && (
                    <View style={styles.deliverablesContainer}>
                      <Text style={styles.deliverablesTitle}>Deliverables:</Text>
                      {proposal.deliverables.map((del, index) => (
                        <Text key={index} style={styles.deliverableItem}>{'\u2022'} {del}</Text>
                      ))}
                    </View>
                  )}

                  {proposal.status === ProposalStatus.SUBMITTED && userType === 'client' && (
                    <View style={styles.proposalActions}>
                      <TouchableOpacity
                        onPress={() => h.handleAcceptProposal(proposal.id, proposal.hiringRequestId)}
                        style={styles.acceptButton}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => h.handleRejectProposal(proposal.id)}
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
      <ApplyModal
        visible={h.showApplyModal}
        selectedJobPosting={h.selectedJobPosting}
        resumeFile={h.resumeFile}
        isSubmitting={h.isSubmitting}
        errorMessage={h.errorMessage}
        onClose={h.closeApplyModal}
        onPickResume={h.handlePickResume}
        onRemoveFile={() => {
          h.setResumeFile(null);
          h.setErrorMessage(null);
        }}
        onSubmit={h.handleSubmitApplication}
        onClearError={() => h.setErrorMessage(null)}
      />
    </View>
    </AppLayout>
  );
};
