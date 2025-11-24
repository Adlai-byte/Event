import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface BookingsViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface Booking {
  id: string;
  eventName: string;
  clientName: string;
  date: string;
  time: string;
  location: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalCost: number;
  serviceName: string;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ user, onNavigate, onLogout }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeRoute, setActiveRoute] = useState('bookings');

  useEffect(() => {
    loadBookings();
  }, [user]);

  // Refresh bookings when filter changes
  useEffect(() => {
    // This ensures the filtered list updates when bookings change
  }, [filterStatus]);

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const time = timeStr.toString().slice(0, 5); // Get HH:MM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const loadBookings = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const providerEmail = encodeURIComponent(user.email);
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/bookings?providerEmail=${providerEmail}`);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: Booking[] = data.rows.map((b: any) => ({
            id: b.idbooking.toString(),
            eventName: b.b_event_name,
            clientName: b.client_name || 'Unknown Client',
            date: formatDate(b.b_event_date),
            time: `${formatTime(b.b_start_time)} - ${formatTime(b.b_end_time)}`,
            location: b.b_location,
            status: b.b_status,
            totalCost: parseFloat(b.b_total_cost) || 0,
            serviceName: b.service_name || 'Service'
          }));
          setBookings(mapped);
        } else {
          setBookings([]);
        }
      } else {
        console.error('Failed to load bookings:', resp.status);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings. Please try again.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      console.log(`Updating booking ${bookingId} to status: ${newStatus}`);
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      console.log('Response status:', resp.status);
      
      if (resp.ok) {
        const data = await resp.json();
        console.log('Response data:', data);
        if (data.ok) {
          // Reload bookings to get fresh data
          await loadBookings();
          Alert.alert('Success', `Booking ${newStatus === 'cancelled' ? 'cancelled' : 'status updated'} successfully`);
        } else {
          Alert.alert('Error', data.error || 'Failed to update booking status');
        }
      } else {
        const errorData = await resp.json().catch(() => ({ error: 'Failed to update booking status' }));
        console.error('Error response:', errorData);
        Alert.alert('Error', errorData.error || `Failed to update booking status (${resp.status})`);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', `Failed to update booking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const filteredBookings = bookings.filter(b => filterStatus === 'all' || b.status === filterStatus);
  const statusFilters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'completed': return '#4a55e1';
      case 'cancelled': return '#ef4444';
      default: return '#64748B';
    }
  };

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
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Bookings</Text>
            <Text style={styles.headerSubtitle}>Manage your service bookings</Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadBookings}
            disabled={loading}
          >
            <Text style={styles.refreshButtonText}>{loading ? '⟳' : '↻'}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {statusFilters.map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : (
          <>
            {filteredBookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📅</Text>
                <Text style={styles.emptyStateText}>No bookings found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {filterStatus === 'all' 
                    ? 'You don\'t have any bookings yet' 
                    : `No ${filterStatus} bookings`}
                </Text>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Service / Event</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Client</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Time</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Location</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Total</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredBookings.map((booking) => (
                  <View key={booking.id} style={styles.tableRow}>
                    <View style={[styles.tableCell, { flex: 2 }]}>
                      <Text style={styles.tableCellEventName}>{booking.eventName}</Text>
                      <Text style={styles.tableCellServiceName}>{booking.serviceName}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <Text style={styles.tableCellText}>{booking.clientName}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                      <Text style={styles.tableCellText}>{booking.date}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.2 }]}>
                      <Text style={styles.tableCellText}>{booking.time}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={styles.tableCellText} numberOfLines={1}>{booking.location}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={[styles.tableCellText, styles.tableCellPrice]}>
                        ₱{booking.totalCost.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 0.8 }]}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                          {booking.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.tableCell, styles.tableCellActions, { flex: 1.5 }]}>
                      {booking.status === 'pending' && (
                        <>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.confirmButton]}
                            onPress={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                          >
                            <Text style={styles.tableActionButtonText}>Confirm</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.cancelButton]}
                            onPress={async () => {
                              if (Platform.OS === 'web') {
                                const confirmed = window.confirm('Are you sure you want to cancel this booking?');
                                if (confirmed) {
                                  await handleUpdateBookingStatus(booking.id, 'cancelled');
                                }
                              } else {
                                Alert.alert(
                                  'Cancel Booking',
                                  'Are you sure you want to cancel this booking?',
                                  [
                                    { text: 'No', style: 'cancel' },
                                    { 
                                      text: 'Yes', 
                                      style: 'destructive',
                                      onPress: async () => await handleUpdateBookingStatus(booking.id, 'cancelled')
                                    }
                                  ],
                                  { cancelable: true }
                                );
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.tableActionButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <TouchableOpacity 
                          style={[styles.tableActionButton, styles.completeButton]}
                          onPress={() => handleUpdateBookingStatus(booking.id, 'completed')}
                        >
                          <Text style={styles.tableActionButtonText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                      {booking.status === 'completed' && (
                        <Text style={styles.tableCellText}>-</Text>
                      )}
                      {booking.status === 'cancelled' && (
                        <Text style={styles.tableCellText}>-</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
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
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
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
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  tableCellEventName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  tableCellServiceName: {
    fontSize: 12,
    color: '#64748B',
  },
  tableCellText: {
    fontSize: 14,
    color: '#1E293B',
  },
  tableCellPrice: {
    fontWeight: '700',
    color: '#4a55e1',
  },
  tableCellActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tableActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  tableActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  completeButton: {
    backgroundColor: '#4a55e1',
  },
  messageButton: {
    backgroundColor: '#64748B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default BookingsView;

