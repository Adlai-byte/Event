import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '../../components/ui';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { User } from '../../models/User';
import { apiClient } from '../../services/apiClient';
import { AppLayout } from '../../components/layout';
import { colors, semantic } from '../../theme';

interface AnalyticsViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface RevenueTrendItem {
  label: string;
  value: number;
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
  revenueTrend?: RevenueTrendItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const defaultAnalytics: AnalyticsData = {
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    completedBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    servicesCount: 0,
    activeServices: 0,
    revenueTrend: [],
  };

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const { data: analyticsData, isLoading: loading } = useQuery({
    queryKey: ['provider-analytics', user?.uid, timeRange],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; analytics: AnalyticsData }>(
        '/api/provider/analytics',
        { providerId: user?.uid, range: timeRange },
      );
      if (data.ok && data.analytics) {
        return data.analytics;
      }
      return defaultAnalytics;
    },
    enabled: !!user?.uid,
  });

  const analytics = analyticsData ?? defaultAnalytics;

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
          <Feather
            name={icon as any}
            size={isMobile ? 14 : 16}
            color={color || semantic.textSecondary}
          />
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
                color={semantic.primary}
              />
              <StatCard
                title="Bookings"
                value={analytics.totalBookings.toString()}
                subtitle={`${analytics.completedBookings} completed`}
                icon="calendar"
                color={semantic.success}
              />
              <StatCard
                title="Rating"
                value={analytics.averageRating.toFixed(1)}
                subtitle={`${analytics.totalReviews} reviews`}
                icon="star"
                color={semantic.warning}
              />
              <StatCard
                title="Services"
                value={analytics.servicesCount.toString()}
                subtitle={`${analytics.activeServices} active`}
                icon="target"
                color={semantic.error}
              />
            </View>

            {/* Revenue Trend Bar Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Revenue Trend</Text>
              {analytics.revenueTrend && analytics.revenueTrend.length > 0 ? (
                <View style={styles.chartContainer}>
                  {/* Y-axis max label */}
                  <Text style={styles.chartAxisLabel}>
                    ₱ {Math.max(...analytics.revenueTrend.map((d) => d.value)).toLocaleString()}
                  </Text>
                  <View style={styles.chartBarsRow}>
                    {analytics.revenueTrend.map((item, index) => {
                      const maxVal = Math.max(...analytics.revenueTrend!.map((d) => d.value), 1);
                      const barHeight = (item.value / maxVal) * (isMobile ? 120 : 160);
                      return (
                        <View key={`bar-${index}`} style={styles.chartBarWrapper}>
                          <Text style={styles.chartBarValue}>
                            {item.value >= 1000
                              ? `${(item.value / 1000).toFixed(1)}k`
                              : item.value.toString()}
                          </Text>
                          <View
                            style={[
                              styles.chartBar,
                              {
                                height: Math.max(barHeight, 4),
                                backgroundColor: colors.primary[500],
                              },
                            ]}
                          />
                          <Text style={styles.chartBarLabel}>{item.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {/* Baseline */}
                  <View style={styles.chartBaseline} />
                  <Text style={styles.chartSubtext}>Revenue over {timeRange}</Text>
                </View>
              ) : (
                <View style={styles.chartPlaceholder}>
                  <Feather name="bar-chart-2" size={32} color={semantic.textMuted} />
                  <Text style={styles.chartPlaceholderText}>No revenue data available</Text>
                  <Text style={styles.chartPlaceholderSubtext}>Revenue over {timeRange}</Text>
                </View>
              )}
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
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: isMobile ? 12 : 14,
      color: semantic.textSecondary,
    },
    timeRangeContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      backgroundColor: semantic.surface,
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
      backgroundColor: semantic.primary,
    },
    timeRangeText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '600',
    },
    timeRangeTextActive: {
      color: semantic.surface,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: semantic.textSecondary,
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
      backgroundColor: semantic.surface,
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
      color: semantic.textSecondary,
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
      color: semantic.textPrimary,
    },
    statSubtitle: {
      fontSize: isMobile ? 11 : 12,
      color: semantic.textSecondary,
      marginTop: 4,
    },
    chartCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      marginBottom: isMobile ? 12 : 16,
      elevation: 2,
    },
    cardTitle: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: isMobile ? 10 : 12,
    },
    chartContainer: {
      paddingTop: 8,
    },
    chartAxisLabel: {
      fontSize: 10,
      color: semantic.textMuted,
      marginBottom: 4,
      textAlign: 'right',
    },
    chartBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: isMobile ? 150 : 190,
      paddingBottom: 24,
    },
    chartBarWrapper: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'flex-end',
    },
    chartBarValue: {
      fontSize: isMobile ? 9 : 10,
      color: semantic.textSecondary,
      marginBottom: 4,
      fontWeight: '600',
    },
    chartBar: {
      width: isMobile ? 20 : 28,
      borderRadius: 4,
      minHeight: 4,
    },
    chartBarLabel: {
      fontSize: isMobile ? 9 : 10,
      color: semantic.textSecondary,
      marginTop: 6,
      textAlign: 'center',
    },
    chartBaseline: {
      height: 1,
      backgroundColor: semantic.border,
      marginTop: -24,
      marginBottom: 8,
    },
    chartSubtext: {
      fontSize: 12,
      color: semantic.textMuted,
      textAlign: 'center',
      marginTop: 8,
    },
    chartPlaceholder: {
      height: isMobile ? Math.max(160, screenWidth * 0.45) : 200,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: semantic.background,
      borderRadius: 8,
      gap: 8,
    },
    chartPlaceholderText: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 4,
    },
    chartPlaceholderSubtext: {
      fontSize: 12,
      color: semantic.textMuted,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    statsCard: {
      flex: 1,
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: 16,
      elevation: 2,
    },
    statsCardTitle: {
      fontSize: 14,
      color: semantic.textSecondary,
      marginBottom: 8,
    },
    statsCardValue: {
      fontSize: 24,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
  });

export default AnalyticsView;
