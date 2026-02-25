import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../../views/user/HiringView.styles';

interface MyApplicationsListProps {
  myApplications: any[];
  getApplicationStatusColor: (status: string) => string;
}

export const MyApplicationsList: React.FC<MyApplicationsListProps> = ({
  myApplications,
  getApplicationStatusColor,
}) => {
  if (myApplications.length === 0) {
    return (
      <View style={styles.modernEmptyState}>
        <View style={styles.modernEmptyIconContainer}>
          <Text style={styles.modernEmptyIcon}>{'\uD83D\uDCCB'}</Text>
        </View>
        <Text style={styles.modernEmptyTitle}>No applications yet</Text>
        <Text style={styles.modernEmptySubtext}>
          Apply to job postings to see your applications here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.applicationsGrid}>
      {myApplications.map((app) => (
        <View key={app.id} style={styles.modernApplicationCard}>
          <View style={styles.modernApplicationHeader}>
            <View style={styles.modernApplicationHeaderLeft}>
              <Text style={styles.modernApplicationJobTitle}>{app.jobTitle}</Text>
              <View style={styles.modernApplicationProviderContainer}>
                <Text style={styles.modernApplicationProviderIcon}>{'\uD83D\uDC64'}</Text>
                <Text style={styles.modernApplicationProvider}>
                  {app.providerFirstName && app.providerLastName
                    ? `${app.providerFirstName} ${app.providerLastName}`
                    : 'Provider'}
                </Text>
              </View>
            </View>
            <View style={[styles.modernApplicationStatusBadge, {
              backgroundColor: getApplicationStatusColor(app.status) === '#10b981' ? '#ECFDF5' :
                               getApplicationStatusColor(app.status) === '#f59e0b' ? '#FFFBEB' :
                               getApplicationStatusColor(app.status) === '#ef4444' ? '#FEE2E2' :
                               getApplicationStatusColor(app.status) === '#3b82f6' ? '#EFF6FF' : '#F1F5F9',
              borderColor: getApplicationStatusColor(app.status) === '#10b981' ? '#D1FAE5' :
                          getApplicationStatusColor(app.status) === '#f59e0b' ? '#FDE68A' :
                          getApplicationStatusColor(app.status) === '#ef4444' ? '#FECACA' :
                          getApplicationStatusColor(app.status) === '#3b82f6' ? '#DBEAFE' : '#E2E8F0'
            }]}>
              <View style={[styles.modernApplicationStatusDot, {
                backgroundColor: getApplicationStatusColor(app.status)
              }]} />
              <Text style={[styles.modernApplicationStatusText, {
                color: getApplicationStatusColor(app.status)
              }]}>
                {app.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.modernApplicationInfoGrid}>
            <View style={styles.modernApplicationInfoItem}>
              <Text style={styles.modernApplicationInfoIcon}>{'\uD83D\uDCC5'}</Text>
              <View style={styles.modernApplicationInfoTextContainer}>
                <Text style={styles.modernApplicationInfoLabel}>Applied</Text>
                <Text style={styles.modernApplicationInfoValue}>
                  {new Date(app.appliedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>

            {app.interviewDate && app.interviewTime && (
              <View style={styles.modernApplicationInfoItem}>
                <Text style={styles.modernApplicationInfoIcon}>{'\uD83C\uDFAF'}</Text>
                <View style={styles.modernApplicationInfoTextContainer}>
                  <Text style={styles.modernApplicationInfoLabel}>Interview</Text>
                  <Text style={styles.modernApplicationInfoValue}>
                    {new Date(app.interviewDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })} at {app.interviewTime}
                  </Text>
                  {(app as any).interviewDescription && (
                    <Text style={[styles.modernApplicationInfoValue, {
                      fontSize: 12,
                      color: '#64748B',
                      marginTop: 6,
                      fontStyle: 'italic'
                    }]} numberOfLines={3}>
                      {'\uD83D\uDCDD'} {(app as any).interviewDescription}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {app.rejectionNote && (
            <View style={styles.modernRejectionNoteContainer}>
              <View style={styles.modernRejectionNoteHeader}>
                <Text style={styles.modernRejectionNoteIcon}>{'\u26A0\uFE0F'}</Text>
                <Text style={styles.modernRejectionNoteLabel}>Rejection Note</Text>
              </View>
              <Text style={styles.modernRejectionNoteText}>{app.rejectionNote}</Text>
            </View>
          )}

          <View style={styles.modernApplicationDescription}>
            <Text style={styles.modernApplicationDescriptionText} numberOfLines={3}>
              {app.jobDescription}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};
