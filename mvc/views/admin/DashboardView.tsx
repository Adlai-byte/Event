import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '../../components/ui';

import { User } from '../../models/User';
import { apiClient } from '../../services/apiClient';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface DashboardViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalServices: number;
  activeServices: number;
  totalBookings: number;
  pendingBookings: number;
  newUsersThisMonth: number;
  newServicesThisMonth: number;
  completedBookingsThisMonth: number;
  monthlyBookings?: Array<{ month: string; bookings: number }>;
  recentActivity?: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface DashboardStatsResponse {
  ok: boolean;
  data: {
    stats: DashboardStats;
  };
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const { data: statsData, isLoading: loading } = useQuery<DashboardStatsResponse>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStatsResponse>('/api/admin/dashboard-stats'),
    enabled: !!user,
  });

  const stats: DashboardStats = statsData?.data?.stats ?? {
    totalUsers: 0,
    activeUsers: 0,
    totalServices: 0,
    activeServices: 0,
    totalBookings: 0,
    pendingBookings: 0,
    newUsersThisMonth: 0,
    newServicesThisMonth: 0,
    completedBookingsThisMonth: 0,
  };

  const MetricCard = ({
    title,
    value,
    icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string;
    icon?: string;
    color?: string;
    subtitle?: string;
  }) => (
    <View style={[styles.metricCard, color && { borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon ? (
          <Feather
            name={icon as any}
            size={isMobile ? 14 : 16}
            color={color || '#64748B'}
          />
        ) : (
          <Text style={styles.metricDot}>•</Text>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <AppLayout
      role="admin"
      activeRoute="dashboard"
      title="Dashboard"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, {user?.getFullName() || 'Admin'}</Text>
        </View>

        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            {/* Top Metrics */}
            <View style={styles.metricsRow}>
              <MetricCard
                title="Total Users"
                value={stats.totalUsers.toString()}
                icon="users"
                color="#2563EB"
                subtitle={`${stats.activeUsers} active`}
              />
              <MetricCard
                title="Services"
                value={stats.totalServices.toString()}
                icon="target"
                color="#10B981"
                subtitle={`${stats.activeServices} active`}
              />
              <MetricCard
                title="Bookings"
                value={stats.totalBookings.toString()}
                icon="calendar"
                color="#F59E0B"
                subtitle={`${stats.pendingBookings} pending`}
              />
            </View>

            {/* Quick Stats Row */}
            <View style={[styles.row, isMobile && styles.rowMobile]}>
              <View style={[styles.cardLarge, styles.cardGlowBlue]}>
                <View style={[styles.glowOverlay, { backgroundColor: '#2563EB' }]} />
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Monthly Overview</Text>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => onNavigate?.('analytics')}
                    accessibilityRole="button"
                    accessibilityLabel="View analytics details"
                  >
                    <Text style={styles.ctaText}>View Details</Text>
                  </TouchableOpacity>
                </View>
                {/* Bar chart with real data */}
                <View style={styles.barChart}>
                  <Text style={styles.chartLabel}>Bookings per month</Text>
                  <View style={styles.barChartContainer}>
                    {stats.monthlyBookings && stats.monthlyBookings.length > 0
                      ? (() => {
                          const maxBookings = Math.max(
                            ...stats.monthlyBookings.map((m) => m.bookings),
                            1,
                          );
                          return stats.monthlyBookings.map((monthData, i) => {
                            const barHeight =
                              maxBookings > 0
                                ? Math.max(
                                    (monthData.bookings / maxBookings) * (isMobile ? 80 : 100),
                                    4,
                                  )
                                : 4;
                            return (
                              <View key={i} style={styles.barGroup}>
                                <View style={[styles.bar, { height: barHeight }]} />
                                <Text style={styles.barLabel}>{monthData.month}</Text>
                              </View>
                            );
                          });
                        })()
                      : Array.from({ length: 12 }).map((_, i) => (
                          <View key={i} style={styles.barGroup}>
                            <View style={[styles.bar, { height: 4, opacity: 0.3 }]} />
                            <Text style={styles.barLabel}>
                              {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                            </Text>
                          </View>
                        ))}
                  </View>
                </View>
              </View>

              <View style={[styles.cardRightCol, isMobile && styles.cardRightColMobile]}>
                {/* Activity Summary — real "new this month" counts */}
                <View style={styles.progressCard}>
                  <Text style={styles.cardTitle}>Activity Summary</Text>
                  <View style={styles.activityList}>
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#2563EB' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>New users this month</Text>
                        <Text style={styles.activityValue}>+{stats.newUsersThisMonth}</Text>
                      </View>
                    </View>
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#10B981' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>Services added</Text>
                        <Text style={styles.activityValue}>+{stats.newServicesThisMonth}</Text>
                      </View>
                    </View>
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#F59E0B' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>Bookings completed</Text>
                        <Text style={styles.activityValue}>{stats.completedBookingsThisMonth}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsCard}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => onNavigate?.('user')}
                  accessibilityRole="button"
                  accessibilityLabel="Manage users"
                >
                  <Feather name="users" size={isMobile ? 20 : 24} color="#0F172A" />
                  <Text style={styles.quickActionLabel}>Manage Users</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => onNavigate?.('services')}
                  accessibilityRole="button"
                  accessibilityLabel="Manage services"
                >
                  <Feather name="grid" size={isMobile ? 20 : 24} color="#0F172A" />
                  <Text style={styles.quickActionLabel}>Manage Services</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => onNavigate?.('analytics')}
                  accessibilityRole="button"
                  accessibilityLabel="View reports"
                >
                  <Feather
                    name="bar-chart-2"
                    size={isMobile ? 20 : 24}
                    color="#0F172A"
                  />
                  <Text style={styles.quickActionLabel}>View Reports</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity — real data from API */}
            <View style={styles.cardWide}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => onNavigate?.('analytics')}
                  accessibilityRole="button"
                  accessibilityLabel="View all recent activity"
                >
                  <Text style={styles.ctaText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activityTable}>
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity, index) => (
                    <View key={index} style={styles.activityRow}>
                      <View style={styles.activityRowLeft}>
                        <Feather
                          name={
                            activity.type === 'signup'
                              ? 'user-plus'
                              : activity.type === 'booking'
                                ? 'calendar'
                                : 'briefcase'
                          }
                          size={isMobile ? 14 : 16}
                          color="#64748B"
                          style={styles.activityRowIcon}
                        />
                        <Text style={styles.activityCell}>{activity.description}</Text>
                      </View>
                      <Text style={styles.activityCellTime}>
                        {formatTimeAgo(activity.timestamp)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.activityRow}>
                    <Text style={styles.activityCell}>No recent activity</Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
};

const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    main: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    mainContent: {
      padding: isMobile ? 12 : 20,
      paddingBottom: isMobile ? 20 : 20,
    },
    welcomeSection: {
      marginBottom: isMobile ? 16 : 24,
    },
    headerTitle: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isMobile ? 14 : 16,
      color: '#64748B',
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#64748B',
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
      ...(isMobile && {
        marginLeft: -6,
        marginRight: -6,
      }),
    },
    metricCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      marginRight: isMobile ? 6 : 12,
      marginBottom: isMobile ? 8 : 12,
      width: isMobile ? (screenWidth - 48) / 2 : Math.min(180, (screenWidth - 300) / 4),
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    metricSubtitle: {
      fontSize: isMobile ? 11 : 12,
      color: '#64748B',
      marginTop: 4,
    },
    metricHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metricTitle: {
      color: '#64748B',
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
    },
    metricIcon: {
      fontSize: isMobile ? 12 : 14,
    },
    metricDot: {
      color: '#CBD5E1',
      fontSize: isMobile ? 16 : 18,
    },
    metricValue: {
      marginTop: 8,
      fontSize: isMobile ? 18 : 22,
      fontWeight: '700',
      color: '#0F172A',
    },
    row: {
      flexDirection: 'row',
    },
    rowMobile: {
      flexDirection: 'column',
    },
    cardLarge: {
      flex: isMobile ? undefined : 1,
      width: isMobile ? '100%' : undefined,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      marginRight: isMobile ? 0 : 12,
      marginBottom: isMobile ? 12 : 0,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      overflow: 'hidden',
      position: 'relative',
    },
    cardGlowBlue: {
    },
    glowOverlay: {
      display: 'none',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
    },
    cardTitle: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '700',
      color: '#0F172A',
    },
    ctaButton: {
      backgroundColor: '#F8FAFC',
      borderRadius: 10,
      paddingHorizontal: isMobile ? 8 : 10,
      paddingVertical: isMobile ? 5 : 6,
      marginTop: isMobile ? 4 : 0,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    ctaText: {
      color: '#2563EB',
      fontWeight: '700',
      fontSize: isMobile ? 11 : 12,
    },
    barChart: {
      marginTop: isMobile ? 12 : 16,
    },
    chartLabel: {
      fontSize: isMobile ? 11 : 12,
      color: '#64748B',
      marginBottom: isMobile ? 8 : 12,
    },
    barChartContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: isMobile ? 100 : 120,
      justifyContent: 'space-around',
    },
    barGroup: {
      alignItems: 'center',
      flex: 1,
    },
    bar: {
      width: isMobile ? 16 : 20,
      backgroundColor: '#2563EB',
      borderRadius: 4,
      marginBottom: 4,
      minHeight: 4,
    },
    barLabel: {
      fontSize: isMobile ? 9 : 10,
      color: '#64748B',
    },
    activityList: {
      marginTop: isMobile ? 8 : 12,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: isMobile ? 12 : 16,
    },
    activityDot: {
      width: isMobile ? 7 : 8,
      height: isMobile ? 7 : 8,
      borderRadius: 4,
      marginRight: isMobile ? 10 : 12,
    },
    activityContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activityText: {
      fontSize: isMobile ? 12 : 13,
      color: '#64748B',
    },
    activityValue: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '700',
      color: '#0F172A',
    },
    quickActionsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      marginTop: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: isMobile ? 8 : 12,
    },
    quickActionBtn: {
      width: isMobile ? (screenWidth - 48) / 2 : (screenWidth - 300) / 4,
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: isMobile ? 12 : 16,
      alignItems: 'center',
      marginRight: isMobile ? 6 : 12,
      marginBottom: isMobile ? 8 : 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    quickActionIcon: {
      fontSize: isMobile ? 20 : 24,
      marginBottom: isMobile ? 6 : 8,
    },
    quickActionLabel: {
      fontSize: isMobile ? 11 : 12,
      color: '#0F172A',
      fontWeight: '600',
      textAlign: 'center',
    },
    activityTable: {
      marginTop: isMobile ? 8 : 12,
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: isMobile ? 10 : 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    activityRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    activityRowIcon: {
      marginRight: isMobile ? 8 : 10,
    },
    activityCell: {
      fontSize: isMobile ? 12 : 13,
      color: '#64748B',
      flex: 1,
    },
    activityCellTime: {
      fontSize: isMobile ? 11 : 12,
      color: '#94A3B8',
    },
    cardRightCol: {
      width: isMobile ? '100%' : 200,
    },
    cardRightColMobile: {
      marginTop: 12,
    },
    progressCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    cardWide: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
  });

export default DashboardView;
