import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '../../components/ui';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { User } from '../../models/User';
import { apiClient } from '../../services/apiClient';
import { AppLayout } from '../../components/layout';

interface DashboardViewProps {
  user?: User;
  onMenu?: () => void;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface DashboardStats {
  totalServices: number;
  activeServices: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalProposals: number;
  activeProposals: number;
  averageRating: number;
}

interface Activity {
  type: string;
  description: string;
  created_at: string;
  entity_id: number;
  metadata?: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onMenu: _onMenu,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const defaultStats: DashboardStats = {
    totalServices: 0,
    activeServices: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalProposals: 0,
    activeProposals: 0,
    averageRating: 0,
  };

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['provider-dashboard-stats', user?.email],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; stats: DashboardStats }>(
        '/api/provider/dashboard/stats',
        { providerEmail: user?.email },
      );
      if (data.ok && data.stats) {
        return data.stats;
      }
      // Fallback: try to load services individually
      const servicesData = await apiClient.get<{ ok: boolean; rows: any[] }>('/api/services', {
        providerEmail: user?.email,
      });
      if (servicesData.ok && Array.isArray(servicesData.rows)) {
        const totalServices = servicesData.rows.length;
        const activeServices = servicesData.rows.filter((s: any) => s.s_is_active).length;
        return { ...defaultStats, totalServices, activeServices };
      }
      return defaultStats;
    },
    enabled: !!user?.email,
  });

  const { data: activitiesData } = useQuery({
    queryKey: ['provider-activity', user?.email],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; activities: Activity[] }>(
        '/api/provider/activity',
        { providerEmail: user?.email, limit: 4 },
      );
      if (data.ok && Array.isArray(data.activities)) {
        return data.activities;
      }
      return [] as Activity[];
    },
    enabled: !!user?.email,
  });

  const stats = statsData ?? defaultStats;
  const loading = statsLoading;
  const activities = activitiesData ?? [];

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  };

  const getActivityIcon = (activity: Activity): string => {
    if (
      activity.type?.includes('payment') ||
      activity.description?.toLowerCase().includes('payment')
    ) {
      return 'credit-card';
    } else if (
      activity.type?.includes('booking') ||
      activity.description?.toLowerCase().includes('booking')
    ) {
      return 'calendar';
    } else if (
      activity.type?.includes('service') ||
      activity.description?.toLowerCase().includes('service')
    ) {
      return 'package';
    }
    return 'activity';
  };

  const MetricCard = ({
    title,
    value,
    icon,
    subtitle,
  }: {
    title: string;
    value: string;
    icon?: string;
    color?: string;
    subtitle?: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon && (
          <View style={styles.metricIconContainer}>
            <Feather name={icon as any} size={14} color="#64748B" />
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <AppLayout
      role="provider"
      activeRoute="dashboard"
      title="Dashboard"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome heading */}
        <Text style={styles.headerTitle}>
          Welcome back, {user?.getFullName() || user?.email || 'Provider'}
        </Text>
        <Text style={styles.headerSubtitle}>Here's an overview of your business</Text>

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
                title="Services"
                value={stats.totalServices.toString()}
                icon="target"
                subtitle={`${stats.activeServices} active`}
              />
              <MetricCard
                title="Bookings"
                value={stats.totalBookings.toString()}
                icon="calendar"
                subtitle={`${stats.pendingBookings} pending`}
              />
              <MetricCard
                title="Revenue"
                value={`₱ ${stats.monthlyRevenue.toLocaleString()}`}
                icon="dollar-sign"
                subtitle={`₱ ${stats.totalRevenue.toLocaleString()} total`}
              />
            </View>

            {/* Booking Overview + Performance */}
            <View style={styles.row}>
              <View style={styles.cardLarge}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Booking Overview</Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => onNavigate?.('bookings')}
                    accessibilityRole="button"
                    accessibilityLabel="View all bookings"
                  >
                    <Text style={styles.secondaryButtonText}>View All</Text>
                  </TouchableOpacity>
                </View>
                {/* Booking status breakdown */}
                <View style={styles.bookingBreakdown}>
                  <View style={styles.bookingStat}>
                    <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                      <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={[styles.statusBadgeText, { color: '#92400E' }]}>Pending</Text>
                    </View>
                    <Text style={styles.bookingStatValue}>{stats.pendingBookings}</Text>
                  </View>
                  <View style={styles.bookingStat}>
                    <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
                      <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={[styles.statusBadgeText, { color: '#065F46' }]}>Confirmed</Text>
                    </View>
                    <Text style={styles.bookingStatValue}>{stats.confirmedBookings}</Text>
                  </View>
                  <View style={styles.bookingStat}>
                    <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
                      <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
                      <Text style={[styles.statusBadgeText, { color: '#1E40AF' }]}>Completed</Text>
                    </View>
                    <Text style={styles.bookingStatValue}>{stats.completedBookings}</Text>
                  </View>
                  <View style={styles.bookingStat}>
                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                      <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={[styles.statusBadgeText, { color: '#991B1B' }]}>Cancelled</Text>
                    </View>
                    <Text style={styles.bookingStatValue}>{stats.cancelledBookings}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardRightCol}>
                {/* Performance Summary */}
                <View style={styles.progressCard}>
                  <Text style={styles.cardTitle}>Performance</Text>
                  <View style={styles.performanceList}>
                    <View style={styles.performanceItem}>
                      <View style={styles.performanceLeft}>
                        <Feather name="star" size={14} color="#64748B" />
                        <Text style={styles.performanceLabel}>Avg. Rating</Text>
                      </View>
                      <Text style={styles.performanceValue}>{stats.averageRating.toFixed(1)}</Text>
                    </View>
                    <View style={styles.performanceDivider} />
                    <View style={styles.performanceItem}>
                      <View style={styles.performanceLeft}>
                        <Feather name="check-circle" size={14} color="#64748B" />
                        <Text style={styles.performanceLabel}>Active Services</Text>
                      </View>
                      <Text style={styles.performanceValue}>{stats.activeServices}</Text>
                    </View>
                    <View style={styles.performanceDivider} />
                    <View style={styles.performanceItem}>
                      <View style={styles.performanceLeft}>
                        <Feather name="trending-up" size={14} color="#64748B" />
                        <Text style={styles.performanceLabel}>Monthly Revenue</Text>
                      </View>
                      <Text style={styles.performanceValue}>
                        ₱ {stats.monthlyRevenue.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.performanceDivider} />
                    <View style={styles.performanceItem}>
                      <View style={styles.performanceLeft}>
                        <Feather name="send" size={14} color="#64748B" />
                        <Text style={styles.performanceLabel}>Active Proposals</Text>
                      </View>
                      <Text style={styles.performanceValue}>{stats.activeProposals}</Text>
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
                  onPress={() => onNavigate?.('services')}
                  accessibilityRole="button"
                  accessibilityLabel="Add service"
                >
                  <Feather name="plus" size={20} color="#64748B" style={{ marginBottom: 8 }} />
                  <Text style={styles.quickActionLabel}>Add Service</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => onNavigate?.('bookings')}
                  accessibilityRole="button"
                  accessibilityLabel="View bookings"
                >
                  <Feather name="calendar" size={20} color="#64748B" style={{ marginBottom: 8 }} />
                  <Text style={styles.quickActionLabel}>View Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => onNavigate?.('hiring')}
                  accessibilityRole="button"
                  accessibilityLabel="View hiring"
                >
                  <Feather name="briefcase" size={20} color="#64748B" style={{ marginBottom: 8 }} />
                  <Text style={styles.quickActionLabel}>Hiring</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.cardWide}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  accessibilityRole="button"
                  accessibilityLabel="View all recent activity"
                >
                  <Text style={styles.secondaryButtonText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activityTable}>
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <View
                      key={`${activity.type}-${activity.entity_id}-${index}`}
                      style={[
                        styles.activityRow,
                        index < activities.length - 1 && styles.activityRowBorder,
                      ]}
                    >
                      <View style={styles.activityIconWrap}>
                        <Feather
                          name={getActivityIcon(activity) as any}
                          size={14}
                          color="#64748B"
                        />
                      </View>
                      <Text style={styles.activityDescription} numberOfLines={1}>
                        {activity.description}
                      </Text>
                      <Text style={styles.activityTime}>{formatTimeAgo(activity.created_at)}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.activityRow}>
                    <View style={styles.activityIconWrap}>
                      <Feather name="inbox" size={14} color="#94A3B8" />
                    </View>
                    <Text style={styles.activityDescription}>No recent activity</Text>
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
      padding: isMobile ? 16 : 24,
      paddingBottom: isMobile ? 24 : 32,
    },
    headerTitle: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isMobile ? 14 : 15,
      color: '#64748B',
      marginBottom: isMobile ? 20 : 28,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
      gap: isMobile ? 10 : 12,
    },
    metricCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 14 : 18,
      width: isMobile ? (screenWidth - 54) / 2 : Math.min(200, (screenWidth - 96) / 4),
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    metricIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metricTitle: {
      color: '#64748B',
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    metricValue: {
      marginTop: 10,
      fontSize: isMobile ? 20 : 24,
      fontWeight: '700',
      color: '#0F172A',
    },
    metricSubtitle: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 4,
    },
    row: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 12,
    },
    cardLarge: {
      flex: isMobile ? 0 : 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 14 : 18,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
    },
    secondaryButton: {
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    secondaryButtonText: {
      color: '#334155',
      fontWeight: '500',
      fontSize: 12,
    },
    bookingBreakdown: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: isMobile ? 12 : 16,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      gap: isMobile ? 8 : 0,
    },
    bookingStat: {
      alignItems: 'center',
      width: isMobile ? '45%' : 'auto',
      marginBottom: isMobile ? 8 : 0,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
      gap: 5,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '500',
    },
    bookingStatValue: {
      fontSize: isMobile ? 20 : 22,
      fontWeight: '700',
      color: '#0F172A',
    },
    cardRightCol: {
      width: isMobile ? '100%' : 220,
    },
    progressCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    performanceList: {
      marginTop: 16,
    },
    performanceItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    performanceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    performanceLabel: {
      fontSize: 13,
      color: '#64748B',
    },
    performanceValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
    },
    performanceDivider: {
      height: 1,
      backgroundColor: '#F1F5F9',
    },
    quickActionsCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 14 : 18,
      marginTop: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 12,
      gap: isMobile ? 10 : 12,
    },
    quickActionBtn: {
      width: isMobile ? (screenWidth - 64) / 3 : Math.min(140, (screenWidth - 100) / 4),
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: isMobile ? 14 : 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    quickActionLabel: {
      fontSize: isMobile ? 11 : 12,
      color: '#334155',
      fontWeight: '500',
      textAlign: 'center',
    },
    cardWide: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: isMobile ? 14 : 18,
      marginTop: 12,
      marginBottom: 0,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 3,
      elevation: 1,
    },
    activityTable: {
      marginTop: 0,
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    activityRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    activityIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityDescription: {
      flex: 1,
      fontSize: 13,
      color: '#0F172A',
    },
    activityTime: {
      fontSize: 12,
      color: '#94A3B8',
    },
  });

export default DashboardView;
