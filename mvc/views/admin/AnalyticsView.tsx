import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface AdminAnalyticsProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface AnalyticsData {
  totalRevenue: { value: number; change: string; trend: 'up' | 'down' };
  activeUsers: { value: number; change: string; trend: 'up' | 'down' };
  totalBookings: { value: number; change: string; trend: 'up' | 'down' };
  avgBookingValue: { value: number; change: string; trend: 'up' | 'down' };
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  userGrowth: {
    newUsersThisMonth: number;
    activeUsers: number;
    conversionRate: string;
  };
  topServices: Array<{ name: string; bookings: number; revenue: number }>;
  bookingStatusDistribution: Array<{ status: string; count: number; percentage: number; color: string }>;
}

export const AnalyticsView: React.FC<AdminAnalyticsProps> = ({ user, onNavigate, onLogout }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/admin/analytics`);
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

  const StatCard = ({ title, value, change, trend, glowColor }: { title: string; value: string; change?: string; trend?: 'up' | 'down'; glowColor?: string }) => (
    <View style={[styles.statCard, glowColor && { shadowColor: glowColor }]}>
      <View style={[styles.glowOverlay, glowColor && { backgroundColor: glowColor }]} />
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {change && (
        <Text style={[styles.statChange, trend === 'up' ? styles.statChangeUp : styles.statChangeDown]}>
          {trend === 'up' ? '↑' : '↓'} {change}
        </Text>
      )}
    </View>
  );

  return (
    <AppLayout
      role="admin"
      activeRoute="analytics"
      title="Analytics"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics & Reports</Text>
          <Text style={styles.headerSubtitle}>Comprehensive insights and metrics</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : analytics ? (
          <>
            {/* Overview Stats */}
            <View style={styles.statsGrid}>
              <StatCard
                title="Active Users"
                value={analytics.activeUsers.value.toLocaleString()}
                change={`${analytics.activeUsers.change}%`}
                trend={analytics.activeUsers.trend}
                glowColor="#4a55e1"
              />
              <StatCard
                title="Total Bookings"
                value={analytics.totalBookings.value.toLocaleString()}
                change={`${analytics.totalBookings.change}%`}
                trend={analytics.totalBookings.trend}
                glowColor="#10b981"
              />
            </View>

            {/* User Growth */}
            <View style={[styles.card, styles.cardGlowPurple]}>
              <View style={[styles.glowOverlay, { backgroundColor: '#8b5cf6' }]} />
              <Text style={styles.cardTitle}>User Growth</Text>
              <View style={styles.growthContainer}>
                <View style={styles.growthItem}>
                  <Text style={styles.growthLabel}>New Users (This Month)</Text>
                  <Text style={styles.growthValue}>+{analytics.userGrowth.newUsersThisMonth}</Text>
                </View>
                <View style={styles.growthItem}>
                  <Text style={styles.growthLabel}>Active Users</Text>
                  <Text style={styles.growthValue}>{analytics.userGrowth.activeUsers.toLocaleString()}</Text>
                </View>
                <View style={styles.growthItem}>
                  <Text style={styles.growthLabel}>Conversion Rate</Text>
                  <Text style={styles.growthValue}>{analytics.userGrowth.conversionRate}%</Text>
                </View>
              </View>
            </View>

            {/* Top Services */}
            <View style={[styles.card, styles.cardGlowOrange]}>
              <View style={[styles.glowOverlay, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.cardTitle}>Top Performing Services</Text>
              <View style={styles.topServicesList}>
                {analytics.topServices.length > 0 ? (
                  analytics.topServices.map((service, i) => (
                    <View key={i} style={styles.topServiceItem}>
                      <View style={styles.topServiceLeft}>
                        <Text style={styles.topServiceName}>{service.name}</Text>
                        <Text style={styles.topServiceBookings}>{service.bookings} bookings</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No services data available</Text>
                )}
              </View>
            </View>

            {/* Booking Status Distribution */}
            <View style={[styles.card, styles.cardGlowBlue]}>
              <View style={[styles.glowOverlay, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.cardTitle}>Booking Status Distribution</Text>
              <View style={styles.distributionContainer}>
                {analytics.bookingStatusDistribution.map((item, i) => (
                  <View key={i} style={styles.distributionItem}>
                    <View style={styles.distributionHeader}>
                      <View style={[styles.distributionDot, { backgroundColor: item.color }]} />
                      <Text style={styles.distributionLabel}>{item.status}</Text>
                      <Text style={styles.distributionCount}>{item.count}</Text>
                    </View>
                    <View style={styles.distributionBar}>
                      <View style={[styles.distributionBarFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load analytics data</Text>
            <TouchableOpacity onPress={loadAnalytics} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: isMobile ? 12 : 20,
  },
  header: {
    marginBottom: isMobile ? 16 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textShadowColor: '#4a55e1',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerSubtitle: {
    fontSize: isMobile ? 12 : 14,
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: isMobile ? 12 : 20,
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
    width: isMobile
      ? (screenWidth - 48) / 2
      : (screenWidth - 300) / 3,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.6,
  },
  statTitle: {
    fontSize: isMobile ? 11 : 12,
    color: '#64748B',
    marginBottom: isMobile ? 6 : 8,
  },
  statValue: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  statChangeUp: {
    color: '#10b981',
  },
  statChangeDown: {
    color: '#ef4444',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginBottom: isMobile ? 12 : 16,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlowPurple: {
    shadowColor: '#8b5cf6',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cardGlowOrange: {
    shadowColor: '#f59e0b',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cardGlowBlue: {
    shadowColor: '#3b82f6',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cardTitle: {
    fontSize: isMobile ? 14 : 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: isMobile ? 12 : 16,
  },
  growthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  growthItem: {
    alignItems: 'center',
  },
  growthLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  growthValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  topServicesList: {
    marginTop: 8,
  },
  topServiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topServiceLeft: {
    flex: 1,
  },
  topServiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  topServiceBookings: {
    fontSize: 12,
    color: '#64748B',
  },
  distributionContainer: {
    marginTop: 8,
  },
  distributionItem: {
    marginBottom: 16,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  distributionLabel: {
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
  },
  distributionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  distributionBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4a55e1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AnalyticsView;
