import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

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
  monthlyBookings?: Array<{ month: string; bookings: number }>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onNavigate, onLogout }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalServices: 0,
    activeServices: 0,
    totalBookings: 0,
    pendingBookings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      // Load dashboard stats from API
      const statsResp = await fetch(`${getApiBaseUrl()}/api/dashboard/stats`);
      if (statsResp.ok) {
        const statsData = await statsResp.json();
        if (statsData.ok && statsData.stats) {
          setStats(statsData.stats);
        }
      } else {
        // Fallback to loading users individually
        const usersResp = await fetch(`${getApiBaseUrl()}/api/users`);
        if (usersResp.ok) {
          const usersData = await usersResp.json();
          if (usersData.ok && Array.isArray(usersData.rows)) {
            const totalUsers = usersData.rows.length;
            const activeUsers = usersData.rows.filter((u: any) => !u.u_disabled || Number(u.u_disabled) === 0).length;
            setStats(prev => ({ ...prev, totalUsers, activeUsers }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon, color, subtitle }: { title: string; value: string; icon?: string; color?: string; subtitle?: string }) => (
    <View style={[styles.metricCard, color && { borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon ? <Text style={styles.metricIcon}>{icon}</Text> : <Text style={styles.metricDot}>•</Text>}
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
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, {user?.getFullName() || 'Admin'}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading statistics...</Text>
          </View>
        ) : (
          <>
            {/* Top Metrics */}
            <View style={styles.metricsRow}>
              <MetricCard
                title="Total Users"
                value={stats.totalUsers.toString()}
                icon="👥"
                color="#4a55e1"
                subtitle={`${stats.activeUsers} active`}
              />
              <MetricCard
                title="Services"
                value={stats.totalServices.toString()}
                icon="🎯"
                color="#10b981"
                subtitle={`${stats.activeServices} active`}
              />
              <MetricCard
                title="Bookings"
                value={stats.totalBookings.toString()}
                icon="📅"
                color="#f59e0b"
                subtitle={`${stats.pendingBookings} pending`}
              />
            </View>

            {/* Quick Stats Row */}
            <View style={[styles.row, isMobile && styles.rowMobile]}>
              <View style={[styles.cardLarge, styles.cardGlowBlue]}>
                <View style={[styles.glowOverlay, { backgroundColor: '#4a55e1' }]} />
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Monthly Overview</Text>
                  <TouchableOpacity style={styles.ctaButton} onPress={() => onNavigate?.('analytics')}>
                    <Text style={styles.ctaText}>View Details</Text>
                  </TouchableOpacity>
                </View>
                {/* Bar chart with real data */}
                <View style={styles.barChart}>
                  <Text style={styles.chartLabel}>Bookings per month</Text>
                  <View style={styles.barChartContainer}>
                    {stats.monthlyBookings && stats.monthlyBookings.length > 0 ? (
                      (() => {
                        const maxBookings = Math.max(...stats.monthlyBookings.map(m => m.bookings), 1);
                        return stats.monthlyBookings.map((monthData, i) => {
                          const barHeight = maxBookings > 0
                            ? Math.max((monthData.bookings / maxBookings) * (isMobile ? 80 : 100), 4)
                            : 4;
                          return (
                            <View key={i} style={styles.barGroup}>
                              <View style={[styles.bar, { height: barHeight }]} />
                              <Text style={styles.barLabel}>{monthData.month}</Text>
                            </View>
                          );
                        });
                      })()
                    ) : (
                      Array.from({ length: 12 }).map((_, i) => (
                      <View key={i} style={styles.barGroup}>
                          <View style={[styles.bar, { height: 4, opacity: 0.3 }]} />
                        <Text style={styles.barLabel}>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</Text>
                      </View>
                      ))
                    )}
                  </View>
                </View>
              </View>

              <View style={[styles.cardRightCol, isMobile && styles.cardRightColMobile]}>
                {/* Activity Summary */}
                <View style={styles.progressCard}>
                  <Text style={styles.cardTitle}>Activity Summary</Text>
                  <View style={styles.activityList}>
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#4a55e1' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>New users this month</Text>
                        <Text style={styles.activityValue}>+{Math.floor(stats.totalUsers * 0.1)}</Text>
                      </View>
                    </View>
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#10b981' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>Services added</Text>
                        <Text style={styles.activityValue}>+{Math.floor(stats.totalServices * 0.05)}</Text>
                      </View>
                    </View>
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#f59e0b' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>Bookings completed</Text>
                        <Text style={styles.activityValue}>{stats.totalBookings - stats.pendingBookings}</Text>
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
                <TouchableOpacity style={styles.quickActionBtn} onPress={() => onNavigate?.('user')}>
                  <Text style={styles.quickActionIcon}>👤</Text>
                  <Text style={styles.quickActionLabel}>Manage Users</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.cardWide}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                <TouchableOpacity style={styles.ctaButton}>
                  <Text style={styles.ctaText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activityTable}>
                <View style={styles.activityRow}>
                  <Text style={styles.activityCell}>New user registered</Text>
                  <Text style={styles.activityCell}>2 hours ago</Text>
                </View>
                <View style={styles.activityRow}>
                  <Text style={styles.activityCell}>Booking completed</Text>
                  <Text style={styles.activityCell}>5 hours ago</Text>
                </View>
                <View style={styles.activityRow}>
                  <Text style={styles.activityCell}>Service added</Text>
                  <Text style={styles.activityCell}>1 day ago</Text>
                </View>
                <View style={styles.activityRow}>
                  <Text style={styles.activityCell}>Payment received</Text>
                  <Text style={styles.activityCell}>2 days ago</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  main: {
    flex: 1,
  },
  mainContent: {
    padding: isMobile ? 12 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  welcomeSection: {
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
  },
  headerSubtitle: {
    fontSize: isMobile ? 12 : 14,
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
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginRight: isMobile ? 6 : 12,
    marginBottom: isMobile ? 8 : 12,
    width: isMobile
      ? (screenWidth - 48) / 2
      : Math.min(180, (screenWidth - 300) / 4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginRight: isMobile ? 0 : 12,
    marginBottom: isMobile ? 12 : 0,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGlowBlue: {
    shadowColor: '#4a55e1',
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.6,
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
    color: '#1E293B',
  },
  ctaButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: isMobile ? 8 : 10,
    paddingVertical: isMobile ? 5 : 6,
    marginTop: isMobile ? 4 : 0,
  },
  ctaText: {
    color: '#0EA5E9',
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
    backgroundColor: '#4a55e1',
    borderRadius: 4,
    marginBottom: 4,
    minHeight: 4,
    shadowColor: '#4a55e1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#1E293B',
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginTop: 12,
    marginBottom: 12,
    elevation: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: isMobile ? 8 : 12,
  },
  quickActionBtn: {
    width: isMobile
      ? (screenWidth - 48) / 2
      : (screenWidth - 300) / 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
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
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'center',
  },
  activityTable: {
    marginTop: isMobile ? 8 : 12,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: isMobile ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityCell: {
    fontSize: isMobile ? 12 : 13,
    color: '#64748B',
  },
  cardRightCol: {
    width: isMobile ? '100%' : 200,
  },
  cardRightColMobile: {
    marginTop: 12,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    elevation: 2,
  },
  cardWide: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginTop: 12,
    elevation: 2,
  },
});

export default DashboardView;
