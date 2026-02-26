import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { JobApplication } from '../../types/hiring';
import { createStyles } from '../../views/provider/HiringView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

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
  const { isMobile: isMobileBreakpoint, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobileBreakpoint, screenWidth);

  if (applications.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="clipboard" size={48} color="#94A3B8" />
        <Text style={styles.emptyStateText}>No applications yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Applications will appear here when users apply to your job postings
        </Text>
      </View>
    );
  }

  if (isMobile) {
    return (
      <View style={styles.mobileCardContainer}>
        {applications.map((app) => (
          <View key={app.id} style={styles.mobileCard}>
            <View style={styles.mobileCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mobileCardTitle}>{app.jobTitle}</Text>
                <Text style={styles.mobileCardSubtitle}>
                  {app.applicantFirstName && app.applicantLastName
                    ? `${app.applicantFirstName} ${app.applicantLastName}`
                    : app.applicantEmail}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getApplicationStatusColor(app.status) + '20' },
                ]}
              >
                <Text style={[styles.statusText, { color: getApplicationStatusColor(app.status) }]}>
                  {app.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.mobileCardRow}>
              <Text style={styles.mobileCardLabel}>Email</Text>
              <Text style={styles.mobileCardValue}>{app.applicantEmail}</Text>
            </View>
            <View style={styles.mobileCardRow}>
              <Text style={styles.mobileCardLabel}>Applied</Text>
              <Text style={styles.mobileCardValue}>{formatDate(app.appliedAt)}</Text>
            </View>
            <View style={[styles.mobileCardRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.mobileCardLabel}>Interview</Text>
              <Text style={styles.mobileCardValue}>
                {app.interviewDate && app.interviewTime
                  ? `${formatDate(app.interviewDate)} ${app.interviewTime}`
                  : 'Not scheduled'}
              </Text>
            </View>
            <View style={styles.mobileCardActions}>
              <TouchableOpacity
                style={[styles.tableActionButton, styles.downloadButton]}
                onPress={() => onDownloadResume(app.id)}
                accessibilityRole="button"
                accessibilityLabel="Download resume"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="file" size={14} color="#2563EB" />
                  <Text style={styles.tableActionButtonText}>Resume</Text>
                </View>
              </TouchableOpacity>
              {app.status !== 'accepted' && app.status !== 'rejected' && (
                <>
                  <TouchableOpacity
                    style={[styles.tableActionButton, styles.scheduleButton]}
                    onPress={() => onScheduleInterview(app)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      app.interviewDate ? 'Reschedule interview' : 'Schedule interview'
                    }
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather
                        name={app.interviewDate ? 'edit' : 'calendar'}
                        size={14}
                        color="#2563EB"
                      />
                      <Text style={styles.tableActionButtonText}>
                        {app.interviewDate ? 'Reschedule' : 'Schedule'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {isInterviewTimePassed(app) && (
                    <TouchableOpacity
                      style={[styles.tableActionButton, styles.hireButton]}
                      onPress={() => onHire(app)}
                      accessibilityRole="button"
                      accessibilityLabel="Hire applicant"
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="check-circle" size={16} color="#10b981" />
                        <Text style={styles.tableActionButtonText}>Hire</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.tableActionButton, styles.rejectButton]}
                    onPress={() => onReject(app)}
                    accessibilityRole="button"
                    accessibilityLabel="Reject applicant"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="x-circle" size={16} color="#ef4444" />
                      <Text style={styles.tableActionButtonText}>Reject</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </View>
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
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getApplicationStatusColor(app.status) + '20' },
              ]}
            >
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
                  {formatDate(app.interviewDate)}
                  {'\n'}
                  {app.interviewTime}
                </Text>
                {(app as any).interviewDescription && (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                  >
                    <Feather name="file-text" size={11} color="#64748B" />
                    <Text
                      style={[styles.tableCellText, { fontSize: 11, color: '#64748B' }]}
                      numberOfLines={2}
                    >
                      {(app as any).interviewDescription}
                    </Text>
                  </View>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="file" size={14} color="#2563EB" />
                <Text style={styles.tableActionButtonText}>Resume</Text>
              </View>
            </TouchableOpacity>
            {app.status !== 'accepted' && app.status !== 'rejected' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.tableActionButton,
                    styles.scheduleButton,
                    app.status !== 'pending' &&
                      app.status !== 'reviewed' &&
                      styles.tableActionButtonDisabled,
                  ]}
                  onPress={() => onScheduleInterview(app)}
                  disabled={app.status !== 'pending' && app.status !== 'reviewed'}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather
                      name={app.interviewDate ? 'edit' : 'calendar'}
                      size={14}
                      color={
                        app.status !== 'pending' && app.status !== 'reviewed'
                          ? '#94A3B8'
                          : '#2563EB'
                      }
                    />
                    <Text
                      style={[
                        styles.tableActionButtonText,
                        app.status !== 'pending' &&
                          app.status !== 'reviewed' &&
                          styles.tableActionButtonTextDisabled,
                      ]}
                    >
                      {app.interviewDate ? 'Reschedule' : 'Schedule'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {app.status === 'reviewed' && isInterviewTimePassed(app) && (
                  <TouchableOpacity
                    style={[styles.tableActionButton, styles.hireButton]}
                    onPress={() => onHire(app)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="check-circle" size={16} color="#10b981" />
                      <Text style={styles.tableActionButtonText}>Hire</Text>
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.tableActionButton,
                    styles.rejectButton,
                    app.status !== 'pending' &&
                      app.status !== 'reviewed' &&
                      styles.tableActionButtonDisabled,
                  ]}
                  onPress={() => onReject(app)}
                  disabled={app.status !== 'pending' && app.status !== 'reviewed'}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather
                      name="x-circle"
                      size={16}
                      color={
                        app.status !== 'pending' && app.status !== 'reviewed'
                          ? '#94A3B8'
                          : '#ef4444'
                      }
                    />
                    <Text
                      style={[
                        styles.tableActionButtonText,
                        app.status !== 'pending' &&
                          app.status !== 'reviewed' &&
                          styles.tableActionButtonTextDisabled,
                      ]}
                    >
                      Reject
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};
