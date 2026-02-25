import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

interface AdminBookingsProps {
  user?: UserModel;
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
  totalCost: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  services: string[];
}

export const BookingsView: React.FC<AdminBookingsProps> = ({ user, onNavigate, onLogout }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: Booking[] = data.rows.map((b: any) => ({
            id: b.idbooking.toString(),
            eventName: b.b_event_name,
            clientName: b.client_name || 'Unknown Client',
            date: b.b_event_date,
            time: `${b.b_start_time} - ${b.b_end_time}`,
            location: b.b_location,
            totalCost: parseFloat(b.b_total_cost) || 0,
            status: b.b_status,
            services: Array.isArray(b.services) ? b.services : []
          }));
          setBookings(mapped);
        }
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: { [key: string]: string } = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    completed: '#10b981',
    cancelled: '#ef4444'
  };

  const statusFilters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch = !searchQuery ||
      b.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => statusColors[status] || '#64748B';

  return (
    <AppLayout
      role="admin"
      activeRoute="bookings"
      title="Bookings"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Bookings Management</Text>
              <Text style={styles.subtitle}>{filteredBookings.length} of {bookings.length} bookings</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search bookings by event name, client, location, date, or service..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
              accessibilityLabel="Search bookings"
            />
          </View>

          {/* Status Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
            {statusFilters.map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.statusChip, filterStatus === status && styles.statusChipActive]}
                onPress={() => setFilterStatus(status)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${status}`}
              >
                <Text style={[styles.statusChipText, filterStatus === status && styles.statusChipTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bookings List */}
          {filteredBookings.map((booking, i) => (
            <View key={booking.id} style={[styles.bookingCard, i > 0 && styles.bookingCardMargin]}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingHeaderLeft}>
                  <Text style={styles.bookingEventName}>{booking.eventName}</Text>
                  <Text style={styles.bookingClientName}>Client: {booking.clientName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(booking.status) }]}>
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>📅 Date:</Text>
                  <Text style={styles.bookingDetailValue}>{booking.date}</Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>🕐 Time:</Text>
                  <Text style={styles.bookingDetailValue}>{booking.time}</Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>📍 Location:</Text>
                  <Text style={styles.bookingDetailValue}>{booking.location}</Text>
                </View>
                <View style={styles.bookingDetailRow}>
                  <Text style={styles.bookingDetailLabel}>💰 Total Cost:</Text>
                  <Text style={styles.bookingDetailValue}>₱ {booking.totalCost.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.servicesContainer}>
                <Text style={styles.servicesLabel}>Services:</Text>
                <View style={styles.servicesList}>
                  {booking.services.map((service, idx) => (
                    <View key={idx} style={styles.serviceTag}>
                      <Text style={styles.serviceTagText}>{service}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.bookingActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => Alert.alert('View Details', `Booking ID: ${booking.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${booking.eventName}`}
                >
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                {booking.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirm ${booking.eventName}`}
                    onPress={async () => {
                      Alert.alert('Confirm Booking', 'Are you sure you want to confirm this booking?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Confirm',
                          onPress: async () => {
                            try {
                              const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}/status`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'confirmed' })
                              });
                              if (resp.ok) {
                                setBookings(prev => prev.map(b =>
                                  b.id === booking.id ? { ...b, status: 'confirmed' as const } : b
                                ));
                              } else {
                                Alert.alert('Error', 'Failed to update booking status');
                              }
                            } catch (error) {
                              Alert.alert('Error', 'Failed to update booking status');
                            }
                          }
                        }
                      ]);
                    }}
                  >
                    <Text style={[styles.actionButtonText, styles.confirmButtonText]}>Confirm</Text>
                  </TouchableOpacity>
                )}
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel ${booking.eventName}`}
                    onPress={async () => {
                      Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
                        { text: 'No', style: 'cancel' },
                        {
                          text: 'Yes, Cancel',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}/status`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'cancelled' })
                              });
                              if (resp.ok) {
                                setBookings(prev => prev.map(b =>
                                  b.id === booking.id ? { ...b, status: 'cancelled' as const } : b
                                ));
                              } else {
                                Alert.alert('Error', 'Failed to update booking status');
                              }
                            } catch (error) {
                              Alert.alert('Error', 'Failed to update booking status');
                            }
                          }
                        }
                      ]);
                    }}
                  >
                    <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {filteredBookings.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No bookings found</Text>
            </View>
          )}
        </View>
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
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statusFilter: {
    marginBottom: 16,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  statusChipActive: {
    backgroundColor: '#4a55e1',
  },
  statusChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  bookingCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookingCardMargin: {
    marginTop: 0,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingHeaderLeft: {
    flex: 1,
  },
  bookingEventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  bookingClientName: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bookingDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    width: 80,
  },
  bookingDetailValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  servicesContainer: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  servicesLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
  },
  servicesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceTag: {
    backgroundColor: '#E0E7FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  serviceTagText: {
    fontSize: 12,
    color: '#4a55e1',
    fontWeight: '600',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  actionButtonText: {
    color: '#1E293B',
    fontWeight: '600',
    fontSize: 12,
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
  },
  searchContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
  },
});

export default BookingsView;
