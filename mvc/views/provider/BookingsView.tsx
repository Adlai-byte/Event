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
  Platform,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface BookingsViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface Booking {
  id: string;
  eventName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  date: string;
  time: string;
  location: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  totalCost: number;
  serviceName: string;
  paymentMethod?: string;
  paymentStatus?: string;
  hasPendingCashPayment?: boolean;
  isPaid?: boolean;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ user, onNavigate, onLogout }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToUpdate, setBookingToUpdate] = useState<string | null>(null);

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
          const mapped: Booking[] = data.rows.map((b: any) => {
            const hasPendingCash = b.has_pending_cash_payment === 1 || 
                                   (b.payment_method === 'Cash on Hand' && b.payment_status === 'pending');
            
            // Debug log
            if (b.b_status === 'confirmed') {
              console.log(`Booking ${b.idbooking}: payment_method=${b.payment_method}, payment_status=${b.payment_status}, hasPendingCash=${hasPendingCash}`);
            }
            
            // If status is 'completed' but not paid, change to 'cancelled'
            let finalStatus = b.b_status;
            if (b.b_status === 'completed' && b.is_paid !== 1) {
              finalStatus = 'cancelled';
            }
            
            return {
            id: b.idbooking.toString(),
            eventName: b.b_event_name,
            clientName: b.client_name || 'Unknown Client',
            clientEmail: b.client_email || null,
            clientPhone: b.client_phone || null,
            clientAddress: b.client_address || null,
            date: formatDate(b.b_event_date),
            time: `${formatTime(b.b_start_time)} - ${formatTime(b.b_end_time)}`,
            location: b.b_location,
            status: finalStatus,
            totalCost: parseFloat(b.b_total_cost) || 0,
              serviceName: b.service_name || 'Service',
            paymentMethod: b.payment_method || null,
            paymentStatus: b.payment_status || null,
            hasPendingCashPayment: hasPendingCash,
            isPaid: b.is_paid === 1
            };
          });
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

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string, reason?: string) => {
    try {
      console.log(`Updating booking ${bookingId} to status: ${newStatus}${reason ? ` with reason: ${reason}` : ''}`);
      const requestBody: any = { status: newStatus };
      if (reason) {
        requestBody.cancellation_reason = reason;
      }
      
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', resp.status);
      
      if (resp.ok) {
        const data = await resp.json();
        console.log('Response data:', data);
        if (data.ok) {
          // Reload bookings to get fresh data
          await loadBookings();
          Alert.alert('Success', `Booking ${newStatus === 'cancelled' ? 'cancelled' : 'confirmed'} successfully`);
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

  const handleConfirmClick = (bookingId: string) => {
    setBookingToUpdate(bookingId);
    setShowConfirmModal(true);
  };

  const handleCancelClick = (bookingId: string) => {
    setBookingToUpdate(bookingId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleConfirmBooking = async () => {
    if (bookingToUpdate) {
      setShowConfirmModal(false);
      await handleUpdateBookingStatus(bookingToUpdate, 'confirmed');
      setBookingToUpdate(null);
    }
  };

  const handleCancelBooking = async () => {
    if (bookingToUpdate && cancelReason.trim()) {
      setShowCancelModal(false);
      await handleUpdateBookingStatus(bookingToUpdate, 'cancelled', cancelReason.trim());
      setBookingToUpdate(null);
      setCancelReason('');
    } else {
      Alert.alert('Required', 'Please provide a reason for cancellation');
    }
  };

  const handleMarkPaymentAsPaid = async (bookingId: string) => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/bookings/${bookingId}/mark-payment-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerEmail: user?.email })
      });
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok) {
          await loadBookings();
          Alert.alert('Success', 'Payment marked as paid successfully');
        } else {
          Alert.alert('Error', data.error || 'Failed to mark payment as paid');
        }
      } else {
        const errorData = await resp.json().catch(() => ({ error: 'Failed to mark payment as paid' }));
        Alert.alert('Error', errorData.error || `Failed to mark payment as paid (${resp.status})`);
      }
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      Alert.alert('Error', `Failed to mark payment as paid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownloadInvoice = async (bookingId: string) => {
    try {
      const invoiceUrl = `${getApiBaseUrl()}/api/provider/bookings/${bookingId}/invoice?providerEmail=${encodeURIComponent(user?.email || '')}`;
      
      if (Platform.OS === 'web') {
        // For web, open in new tab to download
        if (typeof window !== 'undefined') {
          window.open(invoiceUrl, '_blank');
        }
      } else {
        // For mobile, use Linking
        Linking.openURL(invoiceUrl).catch((err) => {
          console.error('Error opening invoice URL:', err);
          Alert.alert('Error', 'Failed to download invoice. Please try again.');
        });
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      Alert.alert('Error', `Failed to download invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch = !searchQuery || 
      b.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });
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
    <AppLayout
      role="provider"
      activeRoute="bookings"
      title="Bookings"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings by event name, client, location, date, or service..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
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
              isMobile ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={styles.tableScrollContainer}
                  contentContainerStyle={styles.tableScrollContent}
                >
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
                                onPress={() => handleConfirmClick(booking.id)}
                              >
                                <Text style={styles.tableActionButtonText}>Confirm</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.tableActionButton, styles.cancelButton]}
                                onPress={() => handleCancelClick(booking.id)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.tableActionButtonText}>Cancel</Text>
                              </TouchableOpacity>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <>
                              {booking.hasPendingCashPayment && (
                                <TouchableOpacity 
                                  style={[styles.tableActionButton, styles.paidButton]}
                                  onPress={() => {
                                    if (Platform.OS === 'web') {
                                      const confirmed = window.confirm('Mark this cash payment as paid?');
                                      if (confirmed) {
                                        handleMarkPaymentAsPaid(booking.id);
                                      }
                                    } else {
                                      Alert.alert(
                                        'Mark Payment as Paid',
                                        'Have you received the cash payment from the customer?',
                                        [
                                          { text: 'Cancel', style: 'cancel' },
                                          { 
                                            text: 'Yes, Mark as Paid', 
                                            onPress: () => handleMarkPaymentAsPaid(booking.id)
                                          }
                                        ]
                                      );
                                    }
                                  }}
                                >
                                  <Text style={styles.tableActionButtonText}>Paid</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity 
                                style={[styles.tableActionButton, styles.completeButton]}
                                onPress={() => handleUpdateBookingStatus(booking.id, 'completed')}
                              >
                                <Text style={styles.tableActionButtonText}>Complete</Text>
                              </TouchableOpacity>
                            </>
                          )}
                          {booking.status === 'completed' && (
                            <>
                              {booking.isPaid ? (
                                <TouchableOpacity 
                                  style={[styles.tableActionButton, styles.invoiceButton]}
                                  onPress={() => handleDownloadInvoice(booking.id)}
                                >
                                  <Text style={styles.tableActionButtonText}>📄 Invoice</Text>
                                </TouchableOpacity>
                              ) : (
                                <Text style={styles.tableCellText}>-</Text>
                              )}
                            </>
                          )}
                          {booking.status === 'confirmed' && booking.isPaid && (
                            <TouchableOpacity 
                              style={[styles.tableActionButton, styles.invoiceButton]}
                              onPress={() => handleDownloadInvoice(booking.id)}
                            >
                              <Text style={styles.tableActionButtonText}>📄 Invoice</Text>
                            </TouchableOpacity>
                          )}
                          {booking.status === 'cancelled' && (
                            <Text style={styles.tableCellText}>-</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
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
                      <TouchableOpacity 
                        style={[styles.tableActionButton, styles.viewDetailsButton]}
                        onPress={() => {
                          setSelectedBooking(booking);
                          setShowClientDetailsModal(true);
                        }}
                      >
                        <Text style={styles.tableActionButtonText}>👁️ Details</Text>
                      </TouchableOpacity>
                      {booking.status === 'pending' && (
                        <>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.confirmButton]}
                            onPress={() => handleConfirmClick(booking.id)}
                          >
                            <Text style={styles.tableActionButtonText}>Confirm</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.cancelButton]}
                            onPress={() => handleCancelClick(booking.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.tableActionButtonText}>Cancel</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                          <>
                            {booking.hasPendingCashPayment && (
                              <TouchableOpacity 
                                style={[styles.tableActionButton, styles.paidButton]}
                                onPress={() => {
                                  if (Platform.OS === 'web') {
                                    const confirmed = window.confirm('Mark this cash payment as paid?');
                                    if (confirmed) {
                                      handleMarkPaymentAsPaid(booking.id);
                                    }
                                  } else {
                                    Alert.alert(
                                      'Mark Payment as Paid',
                                      'Have you received the cash payment from the customer?',
                                      [
                                        { text: 'Cancel', style: 'cancel' },
                                        { 
                                          text: 'Yes, Mark as Paid', 
                                          onPress: () => handleMarkPaymentAsPaid(booking.id)
                                        }
                                      ]
                                    );
                                  }
                                }}
                              >
                                <Text style={styles.tableActionButtonText}>Paid</Text>
                              </TouchableOpacity>
                            )}
                        <TouchableOpacity 
                          style={[styles.tableActionButton, styles.completeButton]}
                          onPress={() => handleUpdateBookingStatus(booking.id, 'completed')}
                        >
                          <Text style={styles.tableActionButtonText}>Complete</Text>
                        </TouchableOpacity>
                          </>
                      )}
                      {booking.status === 'completed' && (
                        <>
                          {booking.isPaid ? (
                            <TouchableOpacity 
                              style={[styles.tableActionButton, styles.invoiceButton]}
                              onPress={() => handleDownloadInvoice(booking.id)}
                            >
                              <Text style={styles.tableActionButtonText}>📄 Invoice</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.tableCellText}>-</Text>
                          )}
                        </>
                      )}
                        {booking.status === 'confirmed' && booking.isPaid && (
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.invoiceButton]}
                            onPress={() => handleDownloadInvoice(booking.id)}
                          >
                            <Text style={styles.tableActionButtonText}>📄 Invoice</Text>
                          </TouchableOpacity>
                        )}
                      {booking.status === 'cancelled' && (
                        <Text style={styles.tableCellText}>-</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Client Details Modal */}
      <Modal
        visible={showClientDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowClientDetailsModal(false);
          setSelectedBooking(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.clientDetailsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowClientDetailsModal(false);
                  setSelectedBooking(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView style={styles.modalBody}>
                {/* Booking Info */}
                <View style={styles.clientDetailsSection}>
                  <Text style={styles.clientDetailsSectionTitle}>Booking Information</Text>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Event:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.eventName}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Service:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.serviceName}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Date:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.date}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Time:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.time}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Location:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.location}</Text>
                  </View>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Total:</Text>
                    <Text style={styles.clientDetailsValue}>₱{selectedBooking.totalCost.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Client Contact Info */}
                <View style={styles.clientDetailsSection}>
                  <Text style={styles.clientDetailsSectionTitle}>Client Contact Information</Text>
                  <View style={styles.clientDetailsRow}>
                    <Text style={styles.clientDetailsLabel}>Name:</Text>
                    <Text style={styles.clientDetailsValue}>{selectedBooking.clientName}</Text>
                  </View>
                  {selectedBooking.clientEmail && (
                    <View style={styles.clientDetailsRow}>
                      <Text style={styles.clientDetailsLabel}>📧 Email:</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.location.href = `mailto:${selectedBooking.clientEmail}`;
                          } else {
                            Linking.openURL(`mailto:${selectedBooking.clientEmail}`);
                          }
                        }}
                      >
                        <Text style={[styles.clientDetailsValue, styles.clientDetailsLink]}>
                          {selectedBooking.clientEmail}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedBooking.clientPhone && (
                    <View style={styles.clientDetailsRow}>
                      <Text style={styles.clientDetailsLabel}>📞 Phone:</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.location.href = `tel:${selectedBooking.clientPhone}`;
                          } else {
                            Linking.openURL(`tel:${selectedBooking.clientPhone}`);
                          }
                        }}
                      >
                        <Text style={[styles.clientDetailsValue, styles.clientDetailsLink]}>
                          {selectedBooking.clientPhone}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedBooking.clientAddress && (
                    <View style={styles.clientDetailsRow}>
                      <Text style={styles.clientDetailsLabel}>📍 Address:</Text>
                      <Text style={[styles.clientDetailsValue, { flex: 1 }]}>
                        {selectedBooking.clientAddress}
                      </Text>
                    </View>
                  )}
                  {!selectedBooking.clientEmail && !selectedBooking.clientPhone && !selectedBooking.clientAddress && (
                    <Text style={[styles.clientDetailsValue, { color: '#94A3B8', fontStyle: 'italic' }]}>
                      No contact information available
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={() => {
                  setShowClientDetailsModal(false);
                  setSelectedBooking(null);
                }}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Booking Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.closeModalIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Are you sure you want to confirm this booking? This action cannot be undone.
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleConfirmBooking}
              >
                <Text style={styles.confirmModalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}>
                <Text style={styles.closeModalIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Please provide a reason for cancelling this booking:
              </Text>
              <TextInput
                style={styles.cancelReasonInput}
                placeholder="Enter cancellation reason..."
                placeholderTextColor="#94a3b8"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitCancelButton]}
                onPress={handleCancelBooking}
                disabled={!cancelReason.trim()}
              >
                <Text style={[styles.submitCancelButtonText, !cancelReason.trim() && styles.disabledButtonText]}>
                  Cancel Booking
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: isMobile ? 12 : 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: isMobile ? 12 : 14,
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
  tableScrollContainer: {
    marginTop: 16,
    ...(isMobile && {
      maxHeight: '100%',
    }),
  },
  tableScrollContent: {
    ...(isMobile && {
      minWidth: 900, // Minimum width to ensure all columns are visible
    }),
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
    width: isMobile ? 900 : '100%', // Fixed width on mobile for horizontal scroll, full width on web
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
    paddingVertical: isMobile ? 8 : 6,
    paddingHorizontal: isMobile ? 10 : 12,
    borderRadius: 6,
    minWidth: isMobile ? 65 : 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableActionButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 10 : 12,
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
  paidButton: {
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  invoiceButton: {
    backgroundColor: '#F59E0B',
    marginRight: 8,
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
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
  },
  viewDetailsButton: {
    backgroundColor: '#6366F1',
    marginRight: 8,
  },
  clientDetailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 600,
    maxHeight: Platform.OS === 'web' ? '90%' : '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } as any : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as any : {}),
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '600',
  },
  clientDetailsSection: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  clientDetailsSectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  clientDetailsRow: {
    flexDirection: 'row',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'flex-start',
  },
  clientDetailsLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#64748B',
    width: Platform.OS === 'web' ? 100 : 90,
    marginRight: Platform.OS === 'web' ? 12 : 8,
  },
  clientDetailsValue: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#1E293B',
    flex: 1,
  },
  clientDetailsLink: {
    color: '#6366F1',
    ...(Platform.OS === 'web' ? {
      textDecorationLine: 'underline',
      cursor: 'pointer',
    } as any : {}),
  },
  closeModalButton: {
    backgroundColor: '#F1F5F9',
  },
  closeModalButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 500,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    }),
  },
  cancelModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: 600,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 10,
    }),
  },
  modalBody: {
    padding: Platform.OS === 'web' ? 24 : 20,
  },
  modalMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    lineHeight: Platform.OS === 'web' ? 24 : 22,
  },
  cancelReasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 16 : 14,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#1E293B',
    minHeight: Platform.OS === 'web' ? 120 : 100,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? {
      resize: 'vertical' as any,
    } : {}),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 24 : 20,
    paddingTop: Platform.OS === 'web' ? 0 : 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalButton: {
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    minWidth: Platform.OS === 'web' ? 100 : 80,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelModalButtonText: {
    color: '#64748B',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  confirmModalButton: {
    backgroundColor: '#10b981',
  },
  confirmModalButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  submitCancelButton: {
    backgroundColor: '#ef4444',
  },
  submitCancelButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#94a3b8',
  },
  closeModalIcon: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    color: '#64748B',
    fontWeight: 'bold',
  },
});

export default BookingsView;

