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

const { width: screenWidth } = Dimensions.get('window');
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

interface DashboardViewProps {
  user?: User;
  onMenu?: () => void;
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
  totalRevenue: number;
  monthlyRevenue: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onMenu, onNavigate, onLogout }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalServices: 0,
    activeServices: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState('dashboard');

  useEffect(() => {
    loadDashboardStats();
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.getInitials() || 'AD'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.getFullName() || 'Admin'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'admin@gmail.com'}</Text>
        </View>

        <View style={styles.sidebarNav}>
          <SidebarItem icon="🏠" label="Dashboard" route="dashboard" />
          <SidebarItem icon="👤" label="Users" route="user" />
          <SidebarItem icon="🚀" label="Provider Applications" route="providerApplications" />
          <SidebarItem icon="📊" label="Analytics" route="analytics" />
          <SidebarItem icon="⚙️" label="Settings" route="settings" />
        </View>

        {/* Sidebar Footer */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.getFullName() || 'Admin'}</Text>
          </View>
          <TouchableOpacity onPress={onMenu} style={styles.menuButton}>
            <Text style={styles.menuIcon}>≡</Text>
          </TouchableOpacity>
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
              <MetricCard 
                title="Revenue" 
                value={`₱ ${stats.monthlyRevenue.toLocaleString()}`} 
                icon="💰" 
                color="#ef4444"
                subtitle={`₱ ${stats.totalRevenue.toLocaleString()} total`}
              />
            </View>

            {/* Quick Stats Row */}
            <View style={styles.row}>
              <View style={styles.cardLarge}>
                <View style={styles.cardHeader}> 
                  <Text style={styles.cardTitle}>Monthly Overview</Text>
                  <TouchableOpacity style={styles.ctaButton} onPress={() => onNavigate?.('analytics')}>
                    <Text style={styles.ctaText}>View Details</Text>
                  </TouchableOpacity>
                </View>
                {/* Bar chart placeholder */}
                <View style={styles.barChart}>
                  <Text style={styles.chartLabel}>Bookings per month</Text>
                  <View style={styles.barChartContainer}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <View key={i} style={styles.barGroup}>
                        <View style={[styles.bar, { height: 20 + (i % 6) * 8 }]} />
                        <Text style={styles.barLabel}>{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.cardRightCol}>
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
                    <View style={styles.activityItem}>
                      <View style={[styles.activityDot, { backgroundColor: '#ef4444' }]} />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>Revenue growth</Text>
                        <Text style={styles.activityValue}>+12%</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  menuIcon: {
    fontSize: 16,
    color: '#64748B',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metricCard: {
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
  metricSubtitle: {
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '600',
  },
  metricIcon: {
    fontSize: 14,
  },
  metricDot: {
    color: '#CBD5E1',
    fontSize: 18,
  },
  metricValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
  },
  cardLarge: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  ctaButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ctaText: {
    color: '#0EA5E9',
    fontWeight: '700',
    fontSize: 12,
  },
  barChart: {
    marginTop: 16,
  },
  chartLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    justifyContent: 'space-around',
  },
  barGroup: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    backgroundColor: '#4a55e1',
    borderRadius: 4,
    marginBottom: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  activityList: {
    marginTop: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 13,
    color: '#64748B',
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    elevation: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  quickActionBtn: {
    width: (screenWidth - sidebarWidth - 80) / 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    textAlign: 'center',
  },
  activityTable: {
    marginTop: 12,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityCell: {
    fontSize: 13,
    color: '#64748B',
  },
  cardRightCol: {
    width: 200,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardWide: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    elevation: 2,
  },
});

export default DashboardView;


