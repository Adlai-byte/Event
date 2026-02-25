import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { JobApplication } from '../../types/hiring';
import { styles } from '../../views/provider/HiringView.styles';

interface ApplicationsTableProps {
  applications: JobApplication[];
  isMobile: boolean;
  formatDate: (dateString: string) => string;
  getApplicationStatusColor: (status: string) => string;
  renderProgressBar: (status: string) => null;
  isInterviewTimePassed: (application: JobApplication) => boolean;
  onDownloadResume: (applicationId: number) => void;
  onScheduleInterview: (application: JobApplication) => void;
  onHire: (application: JobApplication) => void;
  onReject: (application: JobApplication) => void;
}

export const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  isMobile,
  formatDate,
  getApplicationStatusColor,
  renderProgressBar,
  isInterviewTimePassed,
  onDownloadResume,
  onScheduleInterview,
  onHire,
  onReject,
}) => {
  if (applications.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📋</Text>
        <Text style={styles.emptyStateText}>No applications yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Applications will appear here when users apply to your job postings
        </Text>
      </View>
    );
  }

  if (isMobile) {
    return (
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
                  onPress={() => onDownloadResume(app.id)}
                >
                  <Text style={styles.tableActionButtonText}>📄 Resume</Text>
                </TouchableOpacity>
                {app.status !== 'accepted' && app.status !== 'rejected' && (
                  <>
                    <TouchableOpacity
                      style={[styles.tableActionButton, styles.scheduleButton]}
                      onPress={() => onScheduleInterview(app)}
                    >
                      <Text style={styles.tableActionButtonText}>
                        {app.interviewDate ? '✏️ Reschedule' : '📅 Schedule'}
                      </Text>
                    </TouchableOpacity>
                    {isInterviewTimePassed(app) && (
                      <TouchableOpacity
                        style={[styles.tableActionButton, styles.hireButton]}
                        onPress={() => onHire(app)}
                      >
                        <Text style={styles.tableActionButtonText}>✅ Hire</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.tableActionButton, styles.rejectButton]}
                      onPress={() => onReject(app)}
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
    );
  }

  // Desktop view
  return (
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
              onPress={() => onDownloadResume(app.id)}
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
                  onPress={() => onScheduleInterview(app)}
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
                    onPress={() => onHire(app)}
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
                  onPress={() => onReject(app)}
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
  );
};
