import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonCard } from '../../components/ui';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

interface AnalyticsViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
  completedBookings: number;
  averageRating: number;
  totalReviews: number;
  servicesCount: number;
  activeServices: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    completedBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    servicesCount: 0,
    activeServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const resp = await fetch(
        `${getApiBaseUrl()}/api/provider/analytics?providerId=${user?.uid}&range=${timeRange}`,
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.analytics) {
          setAnalytics(data.analytics);
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    color,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    icon?: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, color && { borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        {icon && (
          <Feather name={icon as any} size={isMobile ? 14 : 16} color={color || '#64748B'} />
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <AppLayout
      role="provider"
      activeRoute="analytics"
      title="Analytics"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Track your business performance</Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('week')}
          >
            <Text
              style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('month')}
          >
            <Text
              style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}
            >
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'year' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('year')}
          >
            <Text
              style={[styles.timeRangeText, timeRange === 'year' && styles.timeRangeTextActive]}
            >
              Year
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsRow}>
              <StatCard
                title="Total Revenue"
                value={`₱ ${analytics.totalRevenue.toLocaleString()}`}
                subtitle={`₱ ${analytics.monthlyRevenue.toLocaleString()} this ${timeRange}`}
                icon="dollar-sign"
                color="#4a55e1"
              />
              <StatCard
                title="Bookings"
                value={analytics.totalBookings.toString()}
                subtitle={`${analytics.completedBookings} completed`}
                icon="calendar"
                color="#10b981"
              />
              <StatCard
                title="Rating"
                value={analytics.averageRating.toFixed(1)}
                subtitle={`${analytics.totalReviews} reviews`}
                icon="star"
                color="#f59e0b"
              />
              <StatCard
                title="Services"
                value={analytics.servicesCount.toString()}
                subtitle={`${analytics.activeServices} active`}
                icon="target"
                color="#ef4444"
              />
            </View>

            {/* Performance Chart Placeholder */}
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Revenue Trend</Text>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>Chart visualization would go here</Text>
                <Text style={styles.chartPlaceholderSubtext}>Revenue over {timeRange}</Text>
              </View>
            </View>

            {/* Additional Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardTitle}>Booking Completion Rate</Text>
                <Text style={styles.statsCardValue}>
                  {analytics.totalBookings > 0
                    ? ((analytics.completedBookings / analytics.totalBookings) * 100).toFixed(1)
                    : 0}
                  %
                </Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardTitle}>Average Booking Value</Text>
                <Text style={styles.statsCardValue}>
                  ₱{' '}
                  {analytics.totalBookings > 0
                    ? (analytics.totalRevenue / analytics.totalBookings).toLocaleString()
                    : 0}
                </Text>
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
    },
    mainContent: {
      padding: isMobile ? 12 : 20,
    },
    header: {
      marginBottom: isMobile ? 16 : 24,
    },
    headerTitle: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: '700',
      color: '#1E293B',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isMobile ? 12 : 14,
      color: '#64748B',
    },
    timeRangeContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 4,
    },
    timeRangeButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: 'center',
    },
    timeRangeButtonActive: {
      backgroundColor: '#4a55e1',
    },
    timeRangeText: {
      fontSize: 14,
      color: '#64748B',
      fontWeight: '600',
    },
    timeRangeTextActive: {
      color: '#FFFFFF',
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
      marginBottom: isMobile ? 12 : 16,
      ...(isMobile && {
        marginLeft: -6,
        marginRight: -6,
      }),
    },
    statCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      marginRight: isMobile ? 6 : 12,
      marginBottom: isMobile ? 8 : 12,
      width: isMobile ? (screenWidth - 48) / 2 : Math.min(180, (screenWidth - 300) / 4),
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    statHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statTitle: {
      color: '#64748B',
      fontSize: isMobile ? 11 : 12,
      fontWeight: '600',
    },
    statIcon: {
      fontSize: isMobile ? 12 : 14,
    },
    statValue: {
      marginTop: 8,
      fontSize: isMobile ? 18 : 22,
      fontWeight: '700',
      color: '#0F172A',
    },
    statSubtitle: {
      fontSize: isMobile ? 11 : 12,
      color: '#64748B',
      marginTop: 4,
    },
    chartCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      marginBottom: isMobile ? 12 : 16,
      elevation: 2,
    },
    cardTitle: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '700',
      color: '#1E293B',
      marginBottom: isMobile ? 10 : 12,
    },
    chartPlaceholder: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 8,
    },
    chartPlaceholderText: {
      fontSize: 16,
      color: '#64748B',
      marginBottom: 4,
    },
    chartPlaceholderSubtext: {
      fontSize: 12,
      color: '#94A3B8',
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    statsCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      elevation: 2,
    },
    statsCardTitle: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 8,
    },
    statsCardValue: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1E293B',
    },
  });

export default AnalyticsView;
