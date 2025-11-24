import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

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
  const [activeRoute, setActiveRoute] = useState('analytics');

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
  const SidebarItem = ({ icon, label, route }: { icon: string; label: string; route: string }) => {
    const isActive = activeRoute === route;
    return (
      <TouchableOpacity 
        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]} 
        onPress={() => {
          setActiveRoute(route);
          onNavigate?.(route);
        }}
      >
        <Text style={[styles.sidebarIcon, isActive && styles.sidebarIconActive]}>{icon}</Text>
        <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const StatCard = ({ title, value, change, trend }: { title: string; value: string; change?: string; trend?: 'up' | 'down' }) => (
    <View style={styles.statCard}>
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
    <View style={styles.layout}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.getInitials() || 'AD'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.getFullName() || 'Admin'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.sidebarNav}>
          <SidebarItem icon="🏠" label="Dashboard" route="dashboard" />
          <SidebarItem icon="👤" label="Users" route="user" />
          <SidebarItem icon="🚀" label="Provider Applications" route="providerApplications" />
          <SidebarItem icon="📊" label="Analytics" route="analytics" />
          <SidebarItem icon="⚙️" label="Settings" route="settings" />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
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
                title="Total Revenue" 
                value={`₱ ${analytics.totalRevenue.value.toLocaleString()}`} 
                change={`${analytics.totalRevenue.change}%`} 
                trend={analytics.totalRevenue.trend} 
              />
              <StatCard 
                title="Active Users" 
                value={analytics.activeUsers.value.toLocaleString()} 
                change={`${analytics.activeUsers.change}%`} 
                trend={analytics.activeUsers.trend} 
              />
              <StatCard 
                title="Total Bookings" 
                value={analytics.totalBookings.value.toLocaleString()} 
                change={`${analytics.totalBookings.change}%`} 
                trend={analytics.totalBookings.trend} 
              />
              <StatCard 
                title="Avg. Booking Value" 
                value={`₱ ${analytics.avgBookingValue.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
                change={`${analytics.avgBookingValue.change}%`} 
                trend={analytics.avgBookingValue.trend} 
              />
            </View>

            {/* Revenue Chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Revenue Overview</Text>
              <View style={styles.chartContainer}>
                <View style={styles.chart}>
                  {analytics.monthlyRevenue.map((month, i) => {
                    const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1);
                    const barHeight = maxRevenue > 0 ? (month.revenue / maxRevenue) * 120 : 4;
                    return (
                      <View key={i} style={styles.chartBarContainer}>
                        <View style={[styles.chartBar, { height: Math.max(barHeight, 4) }]} />
                        <Text style={styles.chartLabel}>{month.month}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* User Growth */}
            <View style={styles.card}>
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Performing Services</Text>
              <View style={styles.topServicesList}>
                {analytics.topServices.length > 0 ? (
                  analytics.topServices.map((service, i) => (
                    <View key={i} style={styles.topServiceItem}>
                      <View style={styles.topServiceLeft}>
                        <Text style={styles.topServiceName}>{service.name}</Text>
                        <Text style={styles.topServiceBookings}>{service.bookings} bookings</Text>
                      </View>
                      <Text style={styles.topServiceRevenue}>₱ {service.revenue.toLocaleString()}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No services data available</Text>
                )}
              </View>
            </View>

            {/* Booking Status Distribution */}
            <View style={styles.card}>
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
    </View>
  );
};

const sidebarWidth = Math.min(220, screenWidth * 0.25);

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: 20,
  },
  sidebar: {
    width: sidebarWidth,
    backgroundColor: '#102A43',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1F3B57',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  profileEmail: {
    color: '#9FB3C8',
    fontSize: 12,
    marginTop: 4,
  },
  sidebarNav: {
    marginTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarIcon: {
    width: 26,
    fontSize: 16,
    color: '#DFE7EF',
  },
  sidebarLabel: {
    color: '#DFE7EF',
    fontSize: 14,
    marginLeft: 6,
  },
  logoutButton: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1F3B57',
  },
  logoutIcon: {
    width: 26,
    fontSize: 16,
    color: '#FEE2E2',
  },
  logoutText: {
    color: '#FEE2E2',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    marginBottom: 12,
    width: (screenWidth - sidebarWidth - 80) / 4,
    elevation: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
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
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  chartContainer: {
    marginTop: 8,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    justifyContent: 'space-around',
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#4a55e1',
    borderRadius: 4,
    marginBottom: 8,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#64748B',
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
  topServiceRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
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
  sidebarItemActive: {
    backgroundColor: '#1F3B57',
  },
  sidebarIconActive: {
    color: '#4a55e1',
  },
  sidebarLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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


