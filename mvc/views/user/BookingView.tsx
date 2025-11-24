import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
  AppState,
} from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { getShadowStyle } from '../../utils/shadowStyles';
import { PaymentModal } from '../../components/PaymentModal';
import { EditBookingModal } from '../../components/EditBookingModal';

interface BookingViewProps {
  userId: string;
  userEmail?: string;
  onBack: () => void;
  onNavigateToBookingDetails?: (bookingId: string) => void;
  onNavigateToEditEvent?: (eventId: string) => void;
  onNavigateToMessages?: (conversationId: string) => void;
  refreshKey?: number;
}

interface Booking {
  id: string;
  title: string;
  date: string;
  dateStr?: string; // YYYY-MM-DD format for calendar
  time: string;
  startTime?: string;
  endTime?: string;
  location: string;
  attendees: number;
  status: 'upcoming' | 'past' | 'completed';
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled'; // Database status
  image: string;
  description: string;
  suppliers: string[];
  services?: Array<{
    serviceId?: number;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalCost: number;
  isPaid?: boolean; // Payment status
}

export const BookingView: React.FC<BookingViewProps> = ({
  userId,
  userEmail,
  onBack,
  onNavigateToBookingDetails,
  onNavigateToEditEvent,
  onNavigateToMessages,
  refreshKey
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'cancelled' | 'completed'>('all');
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    if (userEmail) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [userEmail]);

  // Refresh bookings when refreshKey changes (e.g., after payment success)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0 && userEmail) {
      console.log('Refreshing bookings due to payment success, refreshKey:', refreshKey);
      loadBookings();
    }
  }, [refreshKey]);

  // Listen for app state changes to refresh bookings when user returns from PayMongo
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground - refresh bookings to check payment status
        console.log('App has come to the foreground, refreshing bookings...');
        if (userEmail) {
          loadBookings();
        }
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription?.remove();
    };
  }, [userEmail]);

  const loadBookings = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const encodedEmail = encodeURIComponent(userEmail);
      const resp = await fetch(`${getApiBaseUrl()}/api/user/bookings?email=${encodedEmail}`);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const mapped: Booking[] = data.rows.map((b: any) => {
            const eventDate = new Date(b.b_event_date);
            eventDate.setHours(0, 0, 0, 0);
            // Cancelled bookings can be in either upcoming or past based on date
            const isPast = (eventDate < today || b.b_status === 'completed') && b.b_status !== 'cancelled';
            
            // Format date
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            
            // Format time
            const startTime = b.b_start_time ? new Date(`2000-01-01T${b.b_start_time}`).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) : '';
            const endTime = b.b_end_time ? new Date(`2000-01-01T${b.b_end_time}`).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) : '';
            const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : '';
            
            // Get date in YYYY-MM-DD format for calendar
            const dateStr = b.b_event_date;
            
            // Process image URL
            let imageUrl = null;
            if (b.primary_image) {
              const imageData = b.primary_image;
              if (imageData.startsWith('/uploads/')) {
                // Convert relative path to full URL
                imageUrl = `${getApiBaseUrl()}${imageData}`;
              } else if (imageData.startsWith('data:image')) {
                // Already a data URI
                imageUrl = imageData;
              } else if (imageData.length > 100) {
                // Base64 without prefix
                imageUrl = `data:image/jpeg;base64,${imageData}`;
              } else {
                imageUrl = imageData;
              }
            }
            
            return {
              id: b.idbooking.toString(),
              title: b.b_event_name || 'Untitled Event',
              date: formattedDate,
              dateStr: dateStr, // YYYY-MM-DD format for calendar
              time: timeStr,
              startTime: b.b_start_time || '09:00:00',
              endTime: b.b_end_time || '10:00:00',
              location: b.b_location || 'Location not specified',
              attendees: b.b_attendees || 0,
              status: isPast ? (b.b_status === 'completed' ? 'completed' : 'past') : 'upcoming',
              bookingStatus: b.b_status || 'pending', // Store actual database status
              isPaid: b.is_paid === 1 || b.is_paid === true, // Payment status
              image: imageUrl || null,
              description: b.b_notes || b.b_event_name || 'No description available.',
              suppliers: Array.isArray(b.services) ? b.services : [],
              services: Array.isArray(b.serviceDetails) ? b.serviceDetails.map((s: any) => ({
                serviceId: s.serviceId,
                name: s.name,
                description: s.description,
                quantity: s.quantity,
                unitPrice: s.unitPrice,
                totalPrice: s.totalPrice
              })) : [],
              totalCost: parseFloat(b.b_total_cost) || 0
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
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      // Log more details about the network error
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        const apiUrl = getApiBaseUrl();
        const isEmulator = Platform.OS === 'android' && apiUrl.includes('10.0.2.2');
        const isPhysicalDevice = !isEmulator && (Platform.OS === 'android' || Platform.OS === 'ios');
        
        console.error('🌐 Network Error Details:');
        console.error('  - API Base URL:', apiUrl);
        console.error('  - Platform:', Platform.OS);
        console.error('  - Error:', error.message);
        
        if (isEmulator) {
          console.error('  - ⚠️  Android Emulator Detected');
          console.error('  - Solution: Make sure your server is running: npm run server');
          console.error('  - Test server: Open http://localhost:3001/api/health in your browser');
          console.error('  - If server is running, check Windows Firewall settings');
        } else if (isPhysicalDevice) {
          console.error('  - ⚠️  Physical Device Detected');
          console.error('  - Solution: Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 in .env file');
          console.error('  - Find your IP: Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux)');
        } else {
          console.error('  - Solution: Make sure your server is running: npm run server');
        }
      }
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setShowEventDetails(true);
  }, []);

  const handleEditEvent = useCallback((bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      Alert.alert('Error', 'Booking not found');
      return;
    }
    if (booking.isPaid) {
      Alert.alert('Cannot Edit', 'This booking has already been paid and cannot be edited.');
      return;
    }
    // Check if booking is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(booking.dateStr || booking.date);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      Alert.alert('Cannot Edit', 'This booking is in the past and cannot be edited.');
      return;
    }
    setEditingBooking(booking || null);
    setShowEditModal(true);
    setShowEventDetails(false);
  }, [bookings]);

  const handleCancelEvent = useCallback((booking: Booking) => {
    if (booking.isPaid) {
      Alert.alert('Cannot Cancel', 'This booking has already been paid and cannot be canceled.');
      return;
    }
    // Check if booking is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(booking.dateStr || booking.date);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      Alert.alert('Cannot Cancel', 'This booking is in the past and cannot be canceled.');
      return;
    }
    
    Alert.alert(
      'Cancel Event',
      `Are you sure you want to cancel "${booking.title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userEmail) {
                Alert.alert('Error', 'User email is required');
                return;
              }
              
              const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${booking.id}/status`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'cancelled',
                  userEmail: userEmail,
                }),
              });
              
              const data = await resp.json();
              
              if (resp.ok && data.ok) {
                Alert.alert('Success', 'Booking cancelled successfully');
                // Reload bookings to reflect the change
                loadBookings();
                // Close the modal if open
                setShowEventDetails(false);
              } else {
                Alert.alert('Error', data.error || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  }, [userEmail, loadBookings]);

  const handlePay = useCallback((booking: Booking) => {
    setPaymentBooking(booking);
    setShowPaymentModal(true);
  }, []);

  const handlePaymentSuccess = () => {
    // Reload bookings to reflect payment status
    if (userEmail) {
      loadBookings();
    }
  };

  const handleMessageProvider = useCallback(async (bookingId: string) => {
    if (!userEmail) {
      Alert.alert('Error', 'User email is required');
      return;
    }

    try {
      // Get or create conversation for this booking
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${bookingId}/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok && data.conversation) {
        // Navigate to messaging view with conversation ID
        const conversationId = data.conversation.idconversation.toString();
        if (onNavigateToMessages) {
          onNavigateToMessages(conversationId);
        }
      } else {
        Alert.alert('Error', data.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
  }, [userEmail, onNavigateToMessages]);

  // Filter bookings based on active filter
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    
    switch (activeFilter) {
      case 'paid':
        filtered = bookings.filter(b => b.isPaid === true);
        break;
      case 'cancelled':
        filtered = bookings.filter(b => b.bookingStatus === 'cancelled');
        break;
      case 'completed':
        filtered = bookings.filter(b => b.bookingStatus === 'completed');
        break;
      case 'all':
      default:
        filtered = bookings;
        break;
    }
    
    return filtered;
  }, [bookings, activeFilter]);

  const upcomingBookings = useMemo(
    () =>
      filteredBookings.filter(
        (b) =>
          b.status === 'upcoming' &&
          b.bookingStatus !== 'cancelled' &&
          b.bookingStatus !== 'completed'
      ),
    [filteredBookings]
  );

  const completedBookings = useMemo(
    () => filteredBookings.filter((b) => b.bookingStatus === 'completed'),
    [filteredBookings]
  );

  const cancelledBookings = useMemo(
    () => filteredBookings.filter((b) => b.bookingStatus === 'cancelled'),
    [filteredBookings]
  );

  const pastBookings = useMemo(
    () =>
      filteredBookings.filter(
        (b) =>
          b.status === 'past' &&
          b.bookingStatus !== 'cancelled' &&
          b.bookingStatus !== 'completed'
      ),
    [filteredBookings]
  );

  const orderedBookings = useMemo(
    () => [
      ...upcomingBookings,
      ...cancelledBookings,
      ...completedBookings,
      ...pastBookings,
    ],
    [upcomingBookings, cancelledBookings, completedBookings, pastBookings]
  );

  const getSectionTitle = useCallback(
    (booking: Booking): 'Upcoming' | 'Completed' | 'Cancelled' | 'Past' => {
      if (booking.bookingStatus === 'cancelled') return 'Cancelled';
      if (booking.bookingStatus === 'completed' || booking.status === 'completed') return 'Completed';
      if (booking.status === 'upcoming') return 'Upcoming';
      return 'Past';
    },
    []
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Bookings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'paid' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('paid')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'paid' && styles.filterButtonTextActive]}>
              Paid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'cancelled' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('cancelled')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'cancelled' && styles.filterButtonTextActive]}>
              Cancelled
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'completed' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('completed')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'completed' && styles.filterButtonTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* List View */}
      <View style={styles.content}>
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'all' 
                ? 'No bookings yet' 
                : `No ${activeFilter} bookings`}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeFilter === 'all'
                ? 'Your upcoming and past bookings will appear here'
                : `You don't have any ${activeFilter} bookings at the moment`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={orderedBookings}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const sectionTitle = getSectionTitle(item);
              const prevItem = index > 0 ? orderedBookings[index - 1] : null;
              const prevSectionTitle = prevItem ? getSectionTitle(prevItem) : null;
              const showSectionHeader = sectionTitle !== prevSectionTitle;
              const isPastSection = sectionTitle === 'Past' || sectionTitle === 'Completed';
              
              return (
                <View>
                  {showSectionHeader && (
                    <Text style={styles.sectionTitle}>
                      {sectionTitle}
                    </Text>
                  )}
                  <BookingCard
                    booking={item}
                    onViewDetails={() => handleViewDetails(item)}
                    onEdit={() => handleEditEvent(item.id)}
                    onCancel={() => handleCancelEvent(item)}
                    onPay={() => handlePay(item)}
                    isPast={isPastSection}
                  />
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
          />
        )}
      </View>

      {/* Event Details Modal */}
      <Modal
        visible={showEventDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedBooking && (
          <EventDetailsModal
            booking={selectedBooking}
            userEmail={userEmail}
            onClose={() => setShowEventDetails(false)}
            onEdit={() => {
              setShowEventDetails(false);
              handleEditEvent(selectedBooking.id);
            }}
            onCancel={() => {
              setShowEventDetails(false);
              handleCancelEvent(selectedBooking);
            }}
            onPay={() => {
              setShowEventDetails(false);
              handlePay(selectedBooking);
            }}
            onMessageProvider={(bookingId) => {
              setShowEventDetails(false);
              handleMessageProvider(bookingId);
            }}
          />
        )}
      </Modal>

      {/* Payment Modal */}
      {paymentBooking && userEmail && (
        <PaymentModal
          visible={showPaymentModal}
          booking={{
            id: paymentBooking.id,
            title: paymentBooking.title,
            totalCost: paymentBooking.totalCost,
            date: paymentBooking.date,
            time: paymentBooking.time,
          }}
          userEmail={userEmail}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentBooking(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Edit Booking Modal */}
      {editingBooking && userEmail && (
        <EditBookingModal
          visible={showEditModal}
          booking={{
            id: editingBooking.id,
            title: editingBooking.title,
            date: editingBooking.date,
            dateStr: editingBooking.dateStr,
            startTime: editingBooking.startTime,
            endTime: editingBooking.endTime,
            location: editingBooking.location,
            attendees: editingBooking.attendees,
            description: editingBooking.description,
          }}
          userEmail={userEmail}
          onClose={() => {
            setShowEditModal(false);
            setEditingBooking(null);
          }}
          onSuccess={() => {
            if (userEmail) {
              loadBookings();
            }
          }}
        />
      )}
    </View>
  );
};

// Booking Card Component - Memoized for performance
const BookingCard: React.FC<{
  booking: Booking;
  onViewDetails: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onPay?: () => void;
  isPast?: boolean;
}> = React.memo(({ booking, onViewDetails, onEdit, onCancel, onPay, isPast = false }) => {
  const showPayButton = booking.bookingStatus === 'confirmed' && !booking.isPaid;
  
  const [imageError, setImageError] = useState(false);
  
  // Check if booking is in the past (more accurate check using dateStr)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = booking.dateStr ? new Date(booking.dateStr) : new Date(booking.date);
  eventDate.setHours(0, 0, 0, 0);
  const isBookingPast = eventDate < today;
  
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingImageContainer}>
        {booking.image && !imageError ? (
          <Image
            source={{ uri: booking.image }}
            style={styles.bookingImage}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>X</Text>
          </View>
        )}
      </View>
      
      <View style={styles.bookingContent}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingTitle}>{booking.title}</Text>
          <View style={styles.badgeContainer}>
            {booking.bookingStatus === 'cancelled' && (
              <View style={styles.cancelledBadge}>
                <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
              </View>
            )}
            {booking.isPaid && booking.bookingStatus !== 'cancelled' && (
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>PAID</Text>
              </View>
            )}
            {booking.bookingStatus === 'completed' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>COMPLETED</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.bookingDateTime}>
          {booking.date}{booking.time ? ` • ${booking.time}` : ''}
        </Text>
        
        <Text style={styles.bookingDescription}>
          {booking.description}
        </Text>
        
        <View style={styles.bookingActions}>
          {showPayButton && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={onPay}
            >
              <Text style={styles.payButtonText}>PAY</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.viewDetailsButton, showPayButton && styles.viewDetailsButtonWithPay]}
            onPress={onViewDetails}
          >
            <Text style={styles.viewDetailsButtonText}>VIEW BOOK DETAILS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

// Event Details Modal Component
const EventDetailsModal: React.FC<{
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onPay?: () => void;
  onMessageProvider?: (bookingId: string) => void;
  userEmail?: string;
}> = ({ booking, onClose, onEdit, onCancel, onPay, onMessageProvider, userEmail }) => {
  const showPayButton = booking.bookingStatus === 'confirmed' && !booking.isPaid;
  const [imageError, setImageError] = useState(false);
  
  // Check if booking is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(booking.dateStr || booking.date);
  eventDate.setHours(0, 0, 0, 0);
  const isPast = eventDate < today;
  
  return (
    <View style={styles.modalContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Event Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.modalContent}>
        {/* Event Image */}
        <View style={styles.eventImageContainer}>
          {booking.image && !imageError ? (
            <Image
              source={{ uri: booking.image }}
              style={styles.eventImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>X</Text>
            </View>
          )}
        </View>

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{booking.title}</Text>
          <Text style={styles.eventDateTime}>
            {booking.date} - {booking.time}
          </Text>
          <Text style={styles.eventLocation}>{booking.location}</Text>
          
          <Text style={styles.eventDescription}>{booking.description}</Text>
          
          {/* Total Cost */}
          <View style={styles.costSection}>
            <Text style={styles.costLabel}>Total Cost:</Text>
            <View style={styles.costValueContainer}>
              <Text style={styles.costValue}>₱{booking.totalCost.toLocaleString()}</Text>
              {booking.bookingStatus === 'cancelled' && (
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                </View>
              )}
              {booking.isPaid && booking.bookingStatus !== 'cancelled' && (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>PAID</Text>
                </View>
              )}
              {booking.bookingStatus === 'completed' && !booking.isPaid && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>COMPLETED</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Services Details */}
          {booking.services && booking.services.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={styles.servicesTitle}>Services</Text>
              {booking.services.map((service, index) => (
                <View key={index} style={styles.serviceDetailCard}>
                  <Text style={styles.serviceDetailName}>{service.name}</Text>
                  {service.description && (
                    <Text style={styles.serviceDetailDescription}>{service.description}</Text>
                  )}
                  <View style={styles.serviceDetailRow}>
                    <Text style={styles.serviceDetailLabel}>Quantity:</Text>
                    <Text style={styles.serviceDetailValue}>{service.quantity}</Text>
                  </View>
                  <View style={styles.serviceDetailRow}>
                    <Text style={styles.serviceDetailLabel}>Unit Price:</Text>
                    <Text style={styles.serviceDetailValue}>₱{service.unitPrice.toLocaleString()}</Text>
                  </View>
                  <View style={styles.serviceDetailRow}>
                    <Text style={styles.serviceDetailLabel}>Subtotal:</Text>
                    <Text style={styles.serviceDetailValue}>₱{service.totalPrice.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Suppliers */}
          <View style={styles.suppliersSection}>
            <Text style={styles.suppliersTitle}>Suppliers</Text>
            {booking.suppliers.map((supplier, index) => (
              <View key={index} style={styles.supplierItem}>
                <View style={styles.supplierImage}>
                  <Text style={styles.placeholderText}>X</Text>
                </View>
                <Text style={styles.supplierName}>{supplier}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.modalActions}>
        {showPayButton && (
          <TouchableOpacity style={styles.payButtonModal} onPress={onPay}>
            <Text style={styles.payButtonText}>PAY</Text>
          </TouchableOpacity>
        )}
        {booking.bookingStatus === 'confirmed' && onMessageProvider && (
          <TouchableOpacity 
            style={[styles.messageButton, showPayButton && styles.messageButtonWithPay]} 
            onPress={() => onMessageProvider(booking.id)}
          >
            <Text style={styles.messageButtonText}>Message Provider</Text>
          </TouchableOpacity>
        )}
        {!booking.isPaid && !isPast && (
          <>
            <TouchableOpacity style={[styles.editButton, (showPayButton || booking.bookingStatus === 'confirmed') && styles.editButtonWithOther]} onPress={onEdit}>
              <Text style={styles.editButtonText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel Event</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636E72',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  bookingImageContainer: {
    marginRight: 16,
  },
  bookingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#95A5A6',
    fontWeight: 'bold',
  },
  bookingContent: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  paidBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paidBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cancelledBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cancelledBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bookingDateTime: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
    fontWeight: '500',
  },
  bookingDescription: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 12,
  },
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  payButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    ...getShadowStyle(0.2, 2, 1),
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewDetailsButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewDetailsButtonWithPay: {
    paddingHorizontal: 12,
  },
  viewDetailsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#636E72',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalContent: {
    flex: 1,
  },
  eventImageContainer: {
    height: 200,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventInfo: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  eventDateTime: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 4,
  },
  eventAttendees: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 16,
  },
  eventDescription: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 24,
  },
  servicesSection: {
    marginBottom: 24,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  serviceDetailCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  serviceDetailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  serviceDetailDescription: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceDetailLabel: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '500',
  },
  serviceDetailValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  suppliersSection: {
    marginBottom: 24,
  },
  suppliersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  supplierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierImage: {
    width: 40,
    height: 40,
    backgroundColor: '#E9ECEF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierName: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  costSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 24,
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  costValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  payButtonModal: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 100,
    marginRight: 8,
    marginBottom: 8,
    ...getShadowStyle(0.2, 2, 1),
  },
  editButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    marginRight: 8,
    marginBottom: 8,
  },
  editButtonWithPay: {
    flex: 1,
    minWidth: 100,
  },
  editButtonWithOther: {
    flex: 1,
    minWidth: 100,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 100,
    marginRight: 8,
    marginBottom: 8,
    ...getShadowStyle(0.2, 2, 1),
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageButtonWithPay: {
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    marginBottom: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BookingView;


