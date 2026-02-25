import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from '../../views/user/HiringView.styles';

interface JobPostingsListProps {
  jobPostings: any[];
  loading: boolean;
  hasAppliedToJob: (jobId: number) => boolean;
  getApplicationStatusForJob: (jobId: number) => string | null;
  getApplicationStatusColor: (status: string) => string;
  onApply: (job: any) => void;
}

export const JobPostingsList: React.FC<JobPostingsListProps> = ({
  jobPostings,
  loading,
  hasAppliedToJob,
  getApplicationStatusForJob,
  getApplicationStatusColor,
  onApply,
}) => {
  if (loading) {
    return (
      <View style={styles.modernLoadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.modernLoadingText}>Loading job postings...</Text>
      </View>
    );
  }

  if (jobPostings.length === 0) {
    return (
      <View style={styles.modernEmptyState}>
        <View style={styles.modernEmptyIconContainer}>
          <Text style={styles.modernEmptyIcon}>{'\uD83D\uDCBC'}</Text>
        </View>
        <Text style={styles.modernEmptyTitle}>No job postings available</Text>
        <Text style={styles.modernEmptySubtext}>
          Check back later for new job opportunities
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.jobPostingsGrid}>
      {jobPostings.map((job) => {
        const hasApplied = hasAppliedToJob(job.id);
        const applicationStatus = getApplicationStatusForJob(job.id);

        return (
          <View key={job.id} style={[
            styles.modernJobCard,
            hasApplied && styles.modernJobCardApplied
          ]}>
            <View style={styles.modernJobCardHeader}>
              <View style={styles.modernJobCardHeaderLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.modernJobTitle}>{job.jobTitle}</Text>
                  {hasApplied && (
                    <View style={[
                      styles.appliedBadge,
                      { backgroundColor: getApplicationStatusColor(applicationStatus || 'pending') + '20' }
                    ]}>
                      <Text style={[
                        styles.appliedBadgeText,
                        { color: getApplicationStatusColor(applicationStatus || 'pending') }
                      ]}>
                        {applicationStatus ? applicationStatus.toUpperCase() : 'APPLIED'}
                      </Text>
                    </View>
                  )}
                </View>
                {job.providerFirstName && job.providerLastName && (
                  <View style={styles.modernJobProviderContainer}>
                    <Text style={styles.modernJobProviderIcon}>{'\uD83D\uDC64'}</Text>
                    <Text style={styles.modernJobProvider}>
                      {job.providerFirstName} {job.providerLastName}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.modernStatusBadge}>
                <View style={styles.modernStatusDot} />
                <Text style={styles.modernStatusText}>
                  {job.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.modernJobDescription} numberOfLines={3}>
              {job.description}
            </Text>

            <View style={styles.modernJobCardFooter}>
              <View style={styles.modernJobInfoItem}>
                <Text style={styles.modernJobInfoIcon}>{'\uD83D\uDCC5'}</Text>
                <View style={styles.modernJobInfoTextContainer}>
                  <Text style={styles.modernJobInfoLabel}>Deadline</Text>
                  <Text style={styles.modernJobInfoValue}>
                    {new Date(job.deadlineDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.modernJobInfoItem}>
                <Text style={styles.modernJobInfoIcon}>{'\uD83D\uDCC6'}</Text>
                <View style={styles.modernJobInfoTextContainer}>
                  <Text style={styles.modernJobInfoLabel}>Posted</Text>
                  <Text style={styles.modernJobInfoValue}>
                    {new Date(job.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
              {((job as any).jobType && String((job as any).jobType).trim() !== '' && String((job as any).jobType).trim() !== 'null') ? (
                <View style={styles.modernJobInfoItem}>
                  <Text style={styles.modernJobInfoIcon}>{'\u23F0'}</Text>
                  <View style={styles.modernJobInfoTextContainer}>
                    <Text style={styles.modernJobInfoLabel}>Job Type</Text>
                    <Text style={styles.modernJobInfoValue}>
                      {String((job as any).jobType).trim() === 'full_time' ? 'Full Time' :
                       String((job as any).jobType).trim() === 'part_time' ? 'Part Time' :
                       String((job as any).jobType).trim()}
                    </Text>
                  </View>
                </View>
              ) : null}
              {((job as any).location && String((job as any).location).trim() !== '' && String((job as any).location).trim() !== 'null') ? (
                <View style={[styles.modernJobInfoItem, styles.modernJobInfoItemLocation]}>
                  <Text style={styles.modernJobInfoIcon}>{'\uD83D\uDCCD'}</Text>
                  <View style={styles.modernJobInfoTextContainer}>
                    <Text style={styles.modernJobInfoLabel}>Location</Text>
                    <Text style={styles.modernJobInfoValue} numberOfLines={3}>
                      {String((job as any).location).trim()}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.modernApplyButton,
                hasApplied && styles.modernApplyButtonDisabled
              ]}
              onPress={() => {
                if (!hasApplied) {
                  onApply(job);
                }
              }}
              activeOpacity={hasApplied ? 1 : 0.8}
              disabled={hasApplied}
            >
              <Text style={[
                styles.modernApplyButtonText,
                hasApplied && styles.modernApplyButtonTextDisabled
              ]}>
                {hasApplied ? 'Already Applied' : 'Apply Now'}
              </Text>
              {!hasApplied && <Text style={styles.modernApplyButtonIcon}>{'\u2192'}</Text>}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};
