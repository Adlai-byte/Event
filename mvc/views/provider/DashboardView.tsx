import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isMobile = screenWidth < 768;
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

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

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onMenu, onNavigate, onLogout }) => {
  const [stats, setStats] = useState<DashboardStats>({
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
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState('dashboard');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    if (user?.email) {
      loadDashboardStats();
      loadRecentActivity();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Load provider dashboard stats from API using email
      const providerEmail = encodeURIComponent(user.email);
      const statsResp = await fetch(`${getApiBaseUrl()}/api/provider/dashboard/stats?providerEmail=${providerEmail}`);
      
      if (statsResp.ok) {
        const statsData = await statsResp.json();
        if (statsData.ok && statsData.stats) {
          setStats(statsData.stats);
        } else {
          console.error('Failed to load stats:', statsData);
        }
      } else {
        console.error('Failed to fetch stats:', statsResp.status, statsResp.statusText);
        // Fallback: try to load services individually
        const servicesResp = await fetch(`${getApiBaseUrl()}/api/services?providerEmail=${providerEmail}`);
        if (servicesResp.ok) {
          const servicesData = await servicesResp.json();
          if (servicesData.ok && Array.isArray(servicesData.rows)) {
            const totalServices = servicesData.rows.length;
            const activeServices = servicesData.rows.filter((s: any) => s.s_is_active).length;
            setStats(prev => ({ ...prev, totalServices, activeServices }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    if (!user?.email) return;
    
    try {
      const providerEmail = encodeURIComponent(user.email);
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/activity?providerEmail=${providerEmail}&limit=4`);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.activities)) {
          setActivities(data.activities);
        }
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

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

  const MetricCard = ({ title, value, icon, color, subtitle }: { title: string; value: string; icon?: string; color?: string; subtitle?: string }) => (
    <View style={[styles.metricCard, color && { borderLeftWidth: 4, borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon ? (
          <View style={[styles.metricIconContainer, color && { backgroundColor: `${color}15` }]}>
            <Text style={styles.metricIcon}>{icon}</Text>
          </View>
        ) : <Text style={styles.metricDot}>•</Text>}
      </View>
      <Text style={[styles.metricValue, color && { color: color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </View>
  );

  const SidebarItem = ({ icon, label, route, onPress }: { icon: string; label: string; route: string; onPress: (route: string) => void }) => {
    const isActive = activeRoute === route;
    return (
      <TouchableOpacity 
        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]} 
        onPress={() => onPress(route)}
      >
        <Text style={[styles.sidebarIcon, isActive && styles.sidebarIconActive]}>{icon}</Text>
        <Text style={[styles.sidebarLabel, isActive && styles.sidebarLabelActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const handleSidebarItemPress = (route: string) => {
    setActiveRoute(route);
    onNavigate?.(route);
    if (isMobile) {
      setSidebarVisible(false);
    }
  };

  const SidebarContent = () => (
    <View style={styles.sidebar}>
      <View style={styles.profileCard}>
        {isMobile && (
          <TouchableOpacity 
            style={styles.closeSidebarButton}
            onPress={() => setSidebarVisible(false)}
          >
            <Text style={styles.closeSidebarIcon}>✕</Text>
          </TouchableOpacity>
        )}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.getInitials() || 'PR'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.getFullName() || 'Provider'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'provider@example.com'}</Text>
      </View>

      <View style={styles.sidebarNav}>
        <SidebarItem icon="🏠" label="Dashboard" route="dashboard" onPress={handleSidebarItemPress} />
        <SidebarItem icon="🎯" label="Services" route="services" onPress={handleSidebarItemPress} />
        <SidebarItem icon="📅" label="Bookings" route="bookings" onPress={handleSidebarItemPress} />
        <SidebarItem icon="💼" label="Hiring" route="hiring" onPress={handleSidebarItemPress} />
        <SidebarItem icon="💬" label="Messages" route="messages" onPress={handleSidebarItemPress} />
        <SidebarItem icon="👤" label="Profile" route="profile" onPress={handleSidebarItemPress} />
        <SidebarItem icon="⚙️" label="Settings" route="settings" onPress={handleSidebarItemPress} />
      </View>

      {/* Sidebar Footer */}
      <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sidebar - Desktop always visible, Mobile in modal */}
      {isMobile ? (
        <Modal
          visible={sidebarVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSidebarVisible(false)}
        >
          <View style={styles.sidebarOverlay}>
            <View style={styles.mobileSidebar}>
              <SidebarContent />
            </View>
          </View>
        </Modal>
      ) : (
        <SidebarContent />
      )}

      {/* Main */}
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Provider Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.getFullName() || user?.email || 'Provider'}</Text>
          </View>
          <TouchableOpacity 
            onPress={isMobile ? () => setSidebarVisible(true) : onMenu} 
            style={styles.menuButton}
          >
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
                title="Services" 
                value={stats.totalServices.toString()} 
                icon="🎯" 
                color="#4a55e1"
                subtitle={`${stats.activeServices} active`}
              />
              <MetricCard 
                title="Bookings" 
                value={stats.totalBookings.toString()} 
                icon="📅" 
                color="#10b981"
                subtitle={`${stats.pendingBookings} pending`}
              />
              <MetricCard 
                title="Revenue" 
                value={`₱ ${stats.monthlyRevenue.toLocaleString()}`} 
                icon="💰" 
                color="#f59e0b"
                subtitle={`₱ ${stats.totalRevenue.toLocaleString()} total`}
              />
              <MetricCard 
                title="Proposals" 
                value={stats.totalProposals.toString()} 
                icon="📝" 
                color="#ef4444"
                subtitle={`${stats.activeProposals} active`}
              />
            </View>

            {/* Quick Stats Row */}
            <View style={styles.row}>
              <View style={[styles.cardLarge, { borderTopWidth: 4, borderTopColor: '#4a55e1' }]}>
                <View style={[styles.cardHeader, { borderBottomWidth: 2, borderBottomColor: '#4a55e1', paddingBottom: 12 }]}>
                  <Text style={[styles.cardTitle, { color: '#4a55e1' }]}>Booking Overview</Text>
                <TouchableOpacity style={[styles.ctaButton, { backgroundColor: '#4a55e1' }]} onPress={() => onNavigate?.('bookings')}>
                  <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>View All</Text>
                </TouchableOpacity>
              </View>
                {/* Booking status breakdown */}
                <View style={styles.bookingBreakdown}>
                  <View style={[styles.bookingStat, { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12 }]}>
                    <View style={[styles.bookingStatIndicator, { backgroundColor: '#f59e0b' }]} />
                    <Text style={[styles.bookingStatLabel, { color: '#92400E', fontWeight: '600' }]}>Pending</Text>
                    <Text style={[styles.bookingStatValue, { color: '#f59e0b' }]}>{stats.pendingBookings}</Text>
                  </View>
                  <View style={[styles.bookingStat, { backgroundColor: '#D1FAE5', borderRadius: 8, padding: 12 }]}>
                    <View style={[styles.bookingStatIndicator, { backgroundColor: '#10b981' }]} />
                    <Text style={[styles.bookingStatLabel, { color: '#065F46', fontWeight: '600' }]}>Confirmed</Text>
                    <Text style={[styles.bookingStatValue, { color: '#10b981' }]}>{stats.confirmedBookings}</Text>
                  </View>
                  <View style={[styles.bookingStat, { backgroundColor: '#E0E7FF', borderRadius: 8, padding: 12 }]}>
                    <View style={[styles.bookingStatIndicator, { backgroundColor: '#4a55e1' }]} />
                    <Text style={[styles.bookingStatLabel, { color: '#3730A3', fontWeight: '600' }]}>Completed</Text>
                    <Text style={[styles.bookingStatValue, { color: '#4a55e1' }]}>{stats.completedBookings}</Text>
                  </View>
                  <View style={[styles.bookingStat, { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12 }]}>
                    <View style={[styles.bookingStatIndicator, { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.bookingStatLabel, { color: '#991B1B', fontWeight: '600' }]}>Cancelled</Text>
                    <Text style={[styles.bookingStatValue, { color: '#ef4444' }]}>{stats.cancelledBookings}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardRightCol}>
                {/* Performance Summary */}
                <View style={[styles.progressCard, { borderTopWidth: 4, borderTopColor: '#4a55e1' }]}>
                  <Text style={styles.cardTitle}>Performance</Text>
                  <View style={styles.activityList}>
                    <View style={[styles.activityItem, { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 8 }]}>
                      <View style={[styles.activityDot, { backgroundColor: '#4a55e1', width: 12, height: 12 }]} />
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityText, { color: '#4a55e1', fontWeight: '600' }]}>Average Rating</Text>
                        <Text style={[styles.activityValue, { color: '#4a55e1', fontSize: 16 }]}>⭐ {stats.averageRating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <View style={[styles.activityItem, { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 8 }]}>
                      <View style={[styles.activityDot, { backgroundColor: '#10b981', width: 12, height: 12 }]} />
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityText, { color: '#10b981', fontWeight: '600' }]}>Active Services</Text>
                        <Text style={[styles.activityValue, { color: '#10b981', fontSize: 16 }]}>{stats.activeServices}</Text>
                      </View>
                    </View>
                    <View style={[styles.activityItem, { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 8 }]}>
                      <View style={[styles.activityDot, { backgroundColor: '#f59e0b', width: 12, height: 12 }]} />
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityText, { color: '#f59e0b', fontWeight: '600' }]}>This Month Revenue</Text>
                        <Text style={[styles.activityValue, { color: '#f59e0b', fontSize: 16 }]}>₱ {stats.monthlyRevenue.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={[styles.activityItem, { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginBottom: 8 }]}>
                      <View style={[styles.activityDot, { backgroundColor: '#ef4444', width: 12, height: 12 }]} />
                      <View style={styles.activityContent}>
                        <Text style={[styles.activityText, { color: '#ef4444', fontWeight: '600' }]}>Active Proposals</Text>
                        <Text style={[styles.activityValue, { color: '#ef4444', fontSize: 16 }]}>{stats.activeProposals}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={[styles.quickActionsCard, { borderTopWidth: 4, borderTopColor: '#f59e0b' }]}>
              <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#4a55e1', borderColor: '#4a55e1' }]} 
                  onPress={() => onNavigate?.('services')}
                >
                  <Text style={styles.quickActionIcon}>➕</Text>
                  <Text style={[styles.quickActionLabel, { color: '#FFFFFF' }]}>Add Service</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#10b981', borderColor: '#10b981' }]} 
                  onPress={() => onNavigate?.('bookings')}
                >
                  <Text style={styles.quickActionIcon}>📅</Text>
                  <Text style={[styles.quickActionLabel, { color: '#FFFFFF' }]}>View Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} 
                  onPress={() => onNavigate?.('proposals')}
                >
                  <Text style={styles.quickActionIcon}>📝</Text>
                  <Text style={[styles.quickActionLabel, { color: '#FFFFFF' }]}>Manage Proposals</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={[styles.cardWide, { borderTopWidth: 4, borderTopColor: '#10b981' }]}>
              <View style={[styles.cardHeader, { borderBottomWidth: 2, borderBottomColor: '#10b981', paddingBottom: 12 }]}>
                <Text style={[styles.cardTitle, { color: '#10b981' }]}>Recent Activity</Text>
                <TouchableOpacity style={[styles.ctaButton, { backgroundColor: '#10b981' }]}>
                  <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activityTable}>
                {activities.length > 0 ? (
                  activities.map((activity, index) => {
                    // Determine color based on activity type
                    let activityColor = '#4a55e1';
                    let bgColor = '#E0E7FF';
                    if (activity.type?.includes('payment') || activity.description?.toLowerCase().includes('payment')) {
                      activityColor = '#10b981';
                      bgColor = '#D1FAE5';
                    } else if (activity.type?.includes('booking') || activity.description?.toLowerCase().includes('booking')) {
                      activityColor = '#4a55e1';
                      bgColor = '#E0E7FF';
                    } else if (activity.type?.includes('service') || activity.description?.toLowerCase().includes('service')) {
                      activityColor = '#f59e0b';
                      bgColor = '#FEF3C7';
                    }
                    
                    return (
                      <View 
                        key={`${activity.type}-${activity.entity_id}-${index}`} 
                        style={[styles.activityRow, { backgroundColor: bgColor, borderRadius: 8, padding: 12, marginBottom: 8 }]}
                      >
                        <View style={[styles.activityDot, { backgroundColor: activityColor, width: 8, height: 8, marginRight: 12 }]} />
                        <Text style={[styles.activityCell, { color: activityColor, fontWeight: '600', flex: 1 }]}>{activity.description}</Text>
                        <Text style={[styles.activityCell, { color: '#64748B', fontSize: 12 }]}>{formatTimeAgo(activity.created_at)}</Text>
                      </View>
                    );
                  })
                ) : (
                  <>
                    <View style={[styles.activityRow, { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12 }]}>
                      <Text style={[styles.activityCell, { color: '#64748B' }]}>No recent activity</Text>
                      <Text style={[styles.activityCell, { color: '#64748B' }]}>-</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const sidebarWidth = isMobile ? screenWidth * 0.8 : Math.min(220, screenWidth * 0.25);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: isMobile ? 'column' : 'row',
    backgroundColor: '#102A43',
  },
  sidebar: {
    width: sidebarWidth,
    backgroundColor: '#102A43',
    paddingVertical: 24,
    paddingHorizontal: 16,
    height: isMobile ? '100%' : undefined,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileSidebar: {
    width: sidebarWidth,
    height: '100%',
    backgroundColor: '#102A43',
  },
  closeSidebarButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F3B57',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeSidebarIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    backgroundColor: '#EEF1F5',
  },
  mainContent: {
    padding: isMobile ? 12 : 20,
    paddingTop: isMobile ? 60 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isMobile ? 16 : 24,
    paddingBottom: isMobile ? 12 : 16,
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
    marginLeft: isMobile ? 6 : 0,
    marginBottom: 12,
    width: isMobile 
      ? (screenWidth - 48) / 2 
      : Math.min(180, (screenWidth - (isMobile ? 0 : sidebarWidth) - 80) / 4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: isMobile ? 18 : 22,
    fontWeight: '700',
  },
  row: {
    flexDirection: isMobile ? 'column' : 'row',
  },
  cardLarge: {
    flex: isMobile ? 0 : 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginRight: isMobile ? 0 : 12,
    marginBottom: isMobile ? 12 : 0,
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
  bookingBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: isMobile ? 12 : 16,
    paddingTop: isMobile ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
  },
  bookingStat: {
    alignItems: 'center',
    width: isMobile ? '50%' : 'auto',
    marginBottom: isMobile ? 12 : 0,
    position: 'relative',
  },
  bookingStatIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  bookingStatLabel: {
    fontSize: isMobile ? 11 : 12,
    color: '#64748B',
    marginBottom: 4,
  },
  bookingStatValue: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '700',
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
    padding: isMobile ? 12 : 16,
    marginTop: 12,
    marginBottom: 12,
    elevation: 2,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    ...(isMobile && {
      marginLeft: -6,
      marginRight: -6,
    }),
  },
  quickActionBtn: {
    width: isMobile 
      ? (screenWidth - 48) / 3 
      : (screenWidth - (isMobile ? 0 : sidebarWidth) - 80) / 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: isMobile ? 12 : 16,
    alignItems: 'center',
    marginRight: isMobile ? 6 : 12,
    marginLeft: isMobile ? 6 : 0,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: isMobile ? 11 : 12,
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
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityCell: {
    fontSize: 13,
    color: '#64748B',
  },
  cardRightCol: {
    width: isMobile ? '100%' : 200,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 0,
    elevation: 2,
  },
});

export default DashboardView;

