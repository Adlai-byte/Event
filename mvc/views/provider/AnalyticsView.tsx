import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

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
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    completedBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    servicesCount: 0,
    activeServices: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState('analytics');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/analytics?providerId=${user?.uid}&range=${timeRange}`);
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

  const StatCard = ({ title, value, subtitle, icon, color }: { 
    title: string; 
    value: string; 
    subtitle?: string; 
    icon?: string; 
    color?: string;
  }) => (
    <View style={[styles.statCard, color && { borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        {icon && <Text style={styles.statIcon}>{icon}</Text>}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.getInitials() || 'PR'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.getFullName() || 'Provider'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'provider@example.com'}</Text>
        </View>

        <View style={styles.sidebarNav}>
          <SidebarItem icon="🏠" label="Dashboard" route="dashboard" />
          <SidebarItem icon="🎯" label="Services" route="services" />
          <SidebarItem icon="📅" label="Bookings" route="bookings" />
          <SidebarItem icon="📝" label="Proposals" route="proposals" />
          <SidebarItem icon="💬" label="Messages" route="messages" />
          <SidebarItem icon="👤" label="Profile" route="profile" />
          <SidebarItem icon="⚙️" label="Settings" route="settings" />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
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
            <Text style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}>Month</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.timeRangeButton, timeRange === 'year' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('year')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'year' && styles.timeRangeTextActive]}>Year</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsRow}>
              <StatCard 
                title="Total Revenue" 
                value={`₱ ${analytics.totalRevenue.toLocaleString()}`} 
                subtitle={`₱ ${analytics.monthlyRevenue.toLocaleString()} this ${timeRange}`}
                icon="💰" 
                color="#4a55e1"
              />
              <StatCard 
                title="Bookings" 
                value={analytics.totalBookings.toString()} 
                subtitle={`${analytics.completedBookings} completed`}
                icon="📅" 
                color="#10b981"
              />
              <StatCard 
                title="Rating" 
                value={`⭐ ${analytics.averageRating.toFixed(1)}`} 
                subtitle={`${analytics.totalReviews} reviews`}
                icon="⭐" 
                color="#f59e0b"
              />
              <StatCard 
                title="Services" 
                value={analytics.servicesCount.toString()} 
                subtitle={`${analytics.activeServices} active`}
                icon="🎯" 
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
                    : 0}%
                </Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardTitle}>Average Booking Value</Text>
                <Text style={styles.statsCardValue}>
                  ₱ {analytics.totalBookings > 0 
                    ? (analytics.totalRevenue / analytics.totalBookings).toLocaleString()
                    : 0}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const sidebarWidth = Math.min(220, screenWidth * 0.25);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
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
  sidebarItemActive: {
    backgroundColor: '#1F3B57',
  },
  sidebarIcon: {
    width: 26,
    fontSize: 16,
    color: '#DFE7EF',
  },
  sidebarIconActive: {
    color: '#fff',
  },
  sidebarLabel: {
    color: '#DFE7EF',
    fontSize: 14,
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  sidebarLabelActive: {
    color: '#fff',
    fontWeight: '600',
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
  main: {
    flex: 1,
  },
  mainContent: {
    padding: 20,
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
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    marginBottom: 12,
    width: Math.min(180, (screenWidth - sidebarWidth - 80) / 4),
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
    fontSize: 12,
    fontWeight: '600',
  },
  statIcon: {
    fontSize: 14,
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
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








