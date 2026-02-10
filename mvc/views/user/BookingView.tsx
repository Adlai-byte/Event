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
  Linking,
  Dimensions,
  TextInput,
} from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { getShadowStyle } from '../../utils/shadowStyles';
import { AppLayout } from '../../components/layout';
import { PaymentModal } from '../../components/PaymentModal';
import { EditBookingModal } from '../../components/EditBookingModal';
import { RatingModal } from '../../components/RatingModal';

interface BookingViewProps {
  userId: string;
  userEmail?: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
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
  user,
  onNavigate,
  onLogout,
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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingService, setRatingService] = useState<{ serviceId: number; serviceName: string } | null>(null);
  const [serviceRatings, setServiceRatings] = useState<Record<number, { rating: number; comment: string | null }>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
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
            
            // Check if this is a multi-day booking (date range stored in notes)
            let formattedDate = '';
            let dateRangeInfo = null;
            
            if (b.b_notes) {
              try {
                dateRangeInfo = JSON.parse(b.b_notes);
                if (dateRangeInfo.startDate && dateRangeInfo.endDate) {
                  // Check if dates are consecutive
                  const allDates = dateRangeInfo.allDates || [];
                  const startDate = new Date(dateRangeInfo.startDate);
                  const endDate = new Date(dateRangeInfo.endDate);
                  
                  // Calculate expected number of days if consecutive
                  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const isConsecutive = allDates.length === daysDiff;
                  
                  if (isConsecutive && allDates.length > 1) {
                    // Consecutive dates - show as range
                    const startFormatted = startDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    const endFormatted = endDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    formattedDate = `${startFormatted} - ${endFormatted}`;
                  } else if (allDates.length > 1) {
                    // Non-consecutive dates - show individual dates with "and"
                    const formattedDates = allDates.map((dateStr: string) => {
                      const date = new Date(dateStr);
                      return date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    });
                    formattedDate = formattedDates.join(' and ');
                  } else if (allDates.length === 1) {
                    // Single date
                    const date = new Date(allDates[0]);
                    formattedDate = date.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  } else {
                    // Fallback to range format if allDates is not available
                    const startFormatted = startDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    const endFormatted = endDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                    formattedDate = `${startFormatted} - ${endFormatted}`;
                  }
                }
              } catch (e) {
                // Notes is not JSON, treat as regular notes
              }
            }
            
            // If not a date range, format single date
            if (!formattedDate) {
              formattedDate = eventDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
            }
            
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
            
            // If status is 'completed' but not paid, change to 'cancelled'
            let finalStatus = b.b_status || 'pending';
            const isPaidValue = b.is_paid === 1 || b.is_paid === true;
            if (finalStatus === 'completed' && !isPaidValue) {
              finalStatus = 'cancelled';
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
              status: isPast ? (finalStatus === 'completed' ? 'completed' : 'past') : 'upcoming',
              bookingStatus: finalStatus, // Store actual database status (adjusted if needed)
              isPaid: isPaidValue, // Payment status
              image: imageUrl || null,
              description: (dateRangeInfo ? null : b.b_notes) || b.b_event_name || 'No description available.',
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

  const loadServiceRatings = useCallback(async (bookingId: string, services: Array<{ serviceId?: number }>) => {
    if (!userEmail) return;
    
    const ratings: Record<number, { rating: number; comment: string | null }> = {};
    
    for (const service of services) {
      if (!service.serviceId) continue;
      
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/bookings/${bookingId}/services/${service.serviceId}/rating?email=${encodeURIComponent(userEmail)}`
        );
        const data = await response.json();
        
        if (data.ok && data.rating) {
          ratings[service.serviceId] = {
            rating: data.rating.rating,
            comment: data.rating.comment,
          };
        }
      } catch (error) {
        console.error(`Error loading rating for service ${service.serviceId}:`, error);
      }
    }
    
    setServiceRatings(ratings);
  }, [userEmail]);

  const handleViewDetails = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setShowEventDetails(true);
    // Load ratings for services in this booking if it's completed
    if (booking.bookingStatus === 'completed' && userEmail) {
      loadServiceRatings(booking.id, booking.services || []);
    }
  }, [userEmail, loadServiceRatings]);

  const handleRateService = (serviceId: number, serviceName: string) => {
    setRatingService({ serviceId, serviceName });
    setShowRatingModal(true);
  };

  const handleRatingSuccess = () => {
    if (selectedBooking && ratingService) {
      loadServiceRatings(selectedBooking.id, selectedBooking.services || []);
    }
  };

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
    
    // Show custom cancel confirmation modal
    setBookingToCancel(booking);
    setCancelReason('');
    setShowCancelModal(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!bookingToCancel || !userEmail) {
      Alert.alert('Error', 'Unable to cancel booking. Please try again.');
            return;
          }
          
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${bookingToCancel.id}/status`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'cancelled',
                  userEmail: userEmail,
          cancellation_reason: cancelReason.trim() || undefined,
                }),
              });
              
              const data = await resp.json();
              
              if (resp.ok && data.ok) {
                Alert.alert('Success', 'Booking cancelled successfully');
                // Reload bookings to reflect the change
                loadBookings();
        // Close modals
                setShowEventDetails(false);
        setShowCancelModal(false);
        setBookingToCancel(null);
        setCancelReason('');
              } else {
                Alert.alert('Error', data.error || 'Failed to cancel booking');
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
  }, [bookingToCancel, userEmail, cancelReason, loadBookings]);

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
    <AppLayout
      role="user"
      activeRoute="bookings"
      title="Bookings"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
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
        animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
        presentationStyle={Platform.OS === 'web' ? 'overFullScreen' : 'pageSheet'}
        transparent={Platform.OS === 'web'}
      >
        {selectedBooking && (
          <EventDetailsModal
            booking={selectedBooking}
            userEmail={userEmail}
            serviceRatings={serviceRatings}
            onRateService={handleRateService}
            onClose={() => setShowEventDetails(false)}
            onEdit={() => {
              setShowEventDetails(false);
              handleEditEvent(selectedBooking.id);
            }}
            onCancel={() => {
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

      {/* Rating Modal */}
      {ratingService && userEmail && selectedBooking && (
        <RatingModal
          visible={showRatingModal}
          serviceName={ratingService.serviceName}
          serviceId={ratingService.serviceId}
          bookingId={selectedBooking.id}
          userEmail={userEmail}
          existingRating={ratingService.serviceId ? serviceRatings[ratingService.serviceId] : null}
          onClose={() => {
            setShowRatingModal(false);
            setRatingService(null);
          }}
          onSuccess={handleRatingSuccess}
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

      {/* Cancel Booking Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
          setBookingToCancel(null);
        }}
      >
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>Cancel Booking</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setBookingToCancel(null);
                }}
                style={styles.cancelModalCloseButton}
              >
                <Text style={styles.cancelModalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cancelModalBody}>
              <Text style={styles.cancelModalMessage}>
                Are you sure you want to cancel "{bookingToCancel?.title}"?
              </Text>
              <Text style={styles.cancelModalSubMessage}>
                (Optional) Please provide a reason for cancellation:
              </Text>
              <TextInput
                style={styles.cancelReasonInput}
                placeholder="Enter cancellation reason (optional)..."
                placeholderTextColor="#94a3b8"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.cancelModalFooter}>
              <TouchableOpacity
                style={[styles.cancelModalButton, styles.cancelModalBackButton]}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setBookingToCancel(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalBackButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalButton, styles.cancelModalConfirmButton]}
                onPress={handleConfirmCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalConfirmButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </AppLayout>
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
  const [imageError, setImageError] = useState(false);
  
  // Check if booking is in the past (more accurate check using dateStr)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = booking.dateStr ? new Date(booking.dateStr) : new Date(booking.date);
  eventDate.setHours(0, 0, 0, 0);
  const bookingIsPast = eventDate < today;
  
  // Show pay button only if confirmed, not paid, and not in the past
  const showPayButton = booking.bookingStatus === 'confirmed' && !booking.isPaid && !bookingIsPast;
  
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingImageContainer}>
        {booking.image && !imageError ? (
          <Image
            source={{ uri: booking.image }}
            style={styles.bookingImage as any}
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
            {booking.bookingStatus === 'completed' && booking.isPaid && (
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
  serviceRatings?: Record<number, { rating: number; comment: string | null }>;
  onRateService?: (serviceId: number, serviceName: string) => void;
}> = ({ booking, onClose, onEdit, onCancel, onPay, onMessageProvider, userEmail, serviceRatings = {}, onRateService }) => {
  const [imageError, setImageError] = useState(false);
  
  // Check if booking is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(booking.dateStr || booking.date);
  eventDate.setHours(0, 0, 0, 0);
  const isPast = eventDate < today;
  
  // Show pay button only if confirmed, not paid, and not in the past
  const showPayButton = booking.bookingStatus === 'confirmed' && !booking.isPaid && !isPast;
  
  const handleDownloadInvoice = async () => {
    if (!userEmail) {
      Alert.alert('Error', 'User email is required');
      return;
    }
    
    try {
      const invoiceUrl = `${getApiBaseUrl()}/api/user/bookings/${booking.id}/invoice?userEmail=${encodeURIComponent(userEmail)}`;
      
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
  
  const isWeb = Platform.OS === 'web';
  
  return (
    <View style={styles.modalContainer}>
      {/* Web: Centered Card Container */}
      {isWeb ? (
        <View style={styles.modalWebCardContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Event Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.modalContent}
        contentContainerStyle={styles.modalContentContainer}
      >
        {/* Event Image */}
        <View style={styles.eventImageContainer}>
          {booking.image && !imageError ? (
            <Image
              source={{ uri: booking.image }}
              style={styles.eventImage as any}
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
            </View>
          </View>
          
          {/* Services Details */}
          {booking.services && booking.services.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={styles.servicesTitle}>Services</Text>
              {booking.services.map((service, index) => {
                const serviceId = service.serviceId;
                const existingRating = serviceId ? serviceRatings[serviceId] : null;
                const isCompleted = booking.bookingStatus === 'completed';
                
                return (
                <View key={index} style={styles.serviceDetailCard}>
                    <View style={styles.serviceDetailHeader}>
                  <Text style={styles.serviceDetailName}>{service.name}</Text>
                      {existingRating && (
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingBadgeText}>★ {existingRating.rating}/5</Text>
                        </View>
                      )}
                    </View>
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
                    {existingRating && existingRating.comment && (
                      <View style={styles.ratingCommentBox}>
                        <Text style={styles.ratingCommentLabel}>Your Review:</Text>
                        <Text style={styles.ratingCommentText}>{existingRating.comment}</Text>
                </View>
                    )}
                    {isCompleted && serviceId && onRateService && !existingRating && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => onRateService(serviceId, service.name)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rateButtonIcon}>⭐</Text>
                        <Text style={styles.rateButtonText}>Rate Service</Text>
                      </TouchableOpacity>
                    )}
                    {isCompleted && existingRating && (
                      <View style={styles.ratedBadge}>
                        <Text style={styles.ratedBadgeText}>✓ Rating Submitted</Text>
                      </View>
                    )}
                  </View>
                );
              })}
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
          <TouchableOpacity style={styles.payButtonModal} onPress={onPay} activeOpacity={0.8}>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>💳</Text>
                    <Text style={styles.payButtonModalText}>Pay Now</Text>
            </View>
          </TouchableOpacity>
        )}
        {booking.isPaid && (
          <TouchableOpacity 
            style={[styles.invoiceButton, showPayButton && styles.invoiceButtonWithPay]} 
            onPress={handleDownloadInvoice}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>📄</Text>
              <Text style={styles.invoiceButtonText}>Invoice</Text>
            </View>
          </TouchableOpacity>
        )}
        {booking.bookingStatus === 'confirmed' && onMessageProvider && (
          <TouchableOpacity 
            style={[styles.messageButton, (showPayButton || booking.isPaid) && styles.messageButtonWithPay]} 
            onPress={() => onMessageProvider(booking.id)}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonIcon}>💬</Text>
              <Text style={styles.messageButtonText}>Message</Text>
            </View>
          </TouchableOpacity>
        )}
        {!booking.isPaid && !isPast && booking.bookingStatus !== 'completed' && booking.bookingStatus !== 'cancelled' && (
          <>
            <TouchableOpacity 
              style={[styles.editButton, (showPayButton || booking.bookingStatus === 'confirmed') && styles.editButtonWithOther]} 
              onPress={onEdit}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>✏️</Text>
                <Text style={styles.editButtonText}>Edit</Text>
              </View>
        </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>❌</Text>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </View>
        </TouchableOpacity>
          </>
        )}
      </View>
        </View>
      ) : (
        <>
          {/* Mobile: Full Screen Layout */}
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Event Details</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            {/* Event Image */}
            <View style={styles.eventImageContainer}>
              {booking.image && !imageError ? (
                <Image
                  source={{ uri: booking.image }}
                  style={styles.eventImage as any}
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
                  {booking.services.map((service, index) => {
                    const serviceId = service.serviceId;
                    const existingRating = serviceId ? serviceRatings[serviceId] : null;
                    const isCompleted = booking.bookingStatus === 'completed';
                    
                    return (
                    <View key={index} style={styles.serviceDetailCard}>
                        <View style={styles.serviceDetailHeader}>
                      <Text style={styles.serviceDetailName}>{service.name}</Text>
                          {existingRating && (
                            <View style={styles.ratingBadge}>
                              <Text style={styles.ratingBadgeText}>★ {existingRating.rating}/5</Text>
                            </View>
                          )}
                        </View>
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
                        {existingRating && existingRating.comment && (
                          <View style={styles.ratingCommentBox}>
                            <Text style={styles.ratingCommentLabel}>Your Review:</Text>
                            <Text style={styles.ratingCommentText}>{existingRating.comment}</Text>
                      </View>
                        )}
                        {isCompleted && serviceId && onRateService && !existingRating && (
                          <TouchableOpacity
                            style={styles.rateButton}
                            onPress={() => onRateService(serviceId, service.name)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.rateButtonIcon}>⭐</Text>
                            <Text style={styles.rateButtonText}>Rate Service</Text>
                          </TouchableOpacity>
                        )}
                        {isCompleted && existingRating && (
                          <View style={styles.ratedBadge}>
                            <Text style={styles.ratedBadgeText}>✓ Rating Submitted</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
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
              <TouchableOpacity style={styles.payButtonModal} onPress={onPay} activeOpacity={0.8}>
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonIcon}>💳</Text>
                  <Text style={styles.payButtonModalText}>Pay Now</Text>
                </View>
              </TouchableOpacity>
            )}
            {booking.isPaid && (
              <TouchableOpacity 
                style={[styles.invoiceButton, showPayButton && styles.invoiceButtonWithPay]} 
                onPress={handleDownloadInvoice}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonIcon}>📄</Text>
                  <Text style={styles.invoiceButtonText}>Invoice</Text>
                </View>
              </TouchableOpacity>
            )}
            {booking.bookingStatus === 'confirmed' && onMessageProvider && (
              <TouchableOpacity 
                style={[styles.messageButton, (showPayButton || booking.isPaid) && styles.messageButtonWithPay]} 
                onPress={() => onMessageProvider(booking.id)}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonIcon}>💬</Text>
                  <Text style={styles.messageButtonText}>Message</Text>
                </View>
              </TouchableOpacity>
            )}
            {!booking.isPaid && !isPast && booking.bookingStatus !== 'completed' && booking.bookingStatus !== 'cancelled' && (
              <>
                <TouchableOpacity 
                  style={[styles.editButton, (showPayButton || booking.bookingStatus === 'confirmed') && styles.editButtonWithOther]} 
                  onPress={onEdit}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>✏️</Text>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>❌</Text>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isMobile = screenWidth < 768 || Platform.OS !== 'web';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : '#F8F9FA',
    ...(Platform.OS === 'web' ? {
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 30,
      paddingBottom: 20,
    } : {
      paddingTop: 20,
    }),
  },
  placeholder: {
    width: 40,
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  filterScrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 32 : 16,
    gap: Platform.OS === 'web' ? 12 : 8,
  },
  filterButton: {
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: Platform.OS === 'web' ? 12 : 20,
    backgroundColor: '#F3F4F6',
    marginRight: Platform.OS === 'web' ? 12 : 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
    } : {}),
  },
  filterButtonText: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
    paddingTop: Platform.OS === 'web' ? 24 : 10,
    paddingBottom: Platform.OS === 'web' ? 24 : 10,
  },
  listContent: {
    paddingBottom: 10,
  },
  section: {
    marginTop: Platform.OS === 'web' ? 32 : 24,
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    marginTop: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 3,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? 24 : 20,
    letterSpacing: -0.4,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 14 : 12,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
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
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.2,
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
    backgroundColor: '#4f46e5',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: Platform.OS === 'web' ? 10 : 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  viewDetailsButtonWithPay: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
  },
  viewDetailsButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 80 : 60,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: Platform.OS === 'web' ? 64 : 48,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    opacity: 0.6,
  },
  emptyStateText: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 22 : 20,
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.5)' : '#F8F9FA',
    ...(Platform.OS === 'web' ? {
      justifyContent: 'center',
      alignItems: 'center',
    } : {}),
  },
  modalWebCardContainer: {
    width: '90%',
    maxWidth: 800,
    maxHeight: screenHeight * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)',
    } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 20 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    color: '#636E72',
    fontWeight: 'bold',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  modalContent: {
    flex: 1,
    maxHeight: Platform.OS === 'web' ? (screenHeight * 0.9 - 180) : undefined,
  },
  modalContentContainer: {
    paddingBottom: Platform.OS === 'web' ? 24 : 20,
  },
  eventImageContainer: {
    height: Platform.OS === 'web' ? 280 : 200,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventInfo: {
    padding: Platform.OS === 'web' ? 28 : 20,
  },
  eventTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
    letterSpacing: -0.5,
  },
  eventDateTime: {
    fontSize: Platform.OS === 'web' ? 16 : 16,
    color: '#64748B',
    marginBottom: Platform.OS === 'web' ? 6 : 4,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: Platform.OS === 'web' ? 16 : 16,
    color: '#64748B',
    marginBottom: Platform.OS === 'web' ? 6 : 4,
    fontWeight: '500',
  },
  eventAttendees: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 16,
  },
  eventDescription: {
    fontSize: Platform.OS === 'web' ? 16 : 16,
    color: '#475569',
    lineHeight: Platform.OS === 'web' ? 26 : 24,
    marginBottom: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '400',
  },
  servicesSection: {
    marginBottom: Platform.OS === 'web' ? 28 : 24,
  },
  servicesTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    letterSpacing: -0.3,
  },
  serviceDetailCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  serviceDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceDetailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  ratingBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingCommentBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratingCommentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  ratingCommentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  rateButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(108, 99, 255, 0.3)',
    } : {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  rateButtonIcon: {
    fontSize: 16,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ratedBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratedBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: Platform.OS === 'web' ? 24 : (isMobile ? 12 : 16),
    paddingTop: Platform.OS === 'web' ? 20 : (isMobile ? 12 : 16),
    paddingBottom: Platform.OS === 'web' ? 24 : 100,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    flexWrap: 'wrap',
    justifyContent: Platform.OS === 'web' ? 'flex-end' : 'space-between',
    gap: Platform.OS === 'web' ? 12 : (isMobile ? 8 : 10),
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobile ? 4 : 6,
  },
  buttonIcon: {
    fontSize: isMobile ? 16 : 18,
  },
  payButtonModal: {
    backgroundColor: '#10b981',
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: isMobile ? 16 : 20,
    borderRadius: isMobile ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: isMobile ? undefined : 1,
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25), 0 2px 6px rgba(16, 185, 129, 0.15)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
      shadowOpacity: 0.25,
      shadowRadius: isMobile ? 8 : 10,
      elevation: isMobile ? 6 : 8,
    }),
  },
  payButtonModalText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  editButton: {
    flex: isMobile ? undefined : 1,
    backgroundColor: '#6366F1',
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: isMobile ? 16 : 20,
    borderRadius: isMobile ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.25), 0 2px 6px rgba(99, 102, 241, 0.15)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
      shadowOpacity: 0.25,
      shadowRadius: isMobile ? 8 : 10,
      elevation: isMobile ? 6 : 8,
    }),
  },
  editButtonWithPay: {
    flex: isMobile ? undefined : 1,
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
  },
  editButtonWithOther: {
    flex: isMobile ? undefined : 1,
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  messageButton: {
    backgroundColor: '#059669',
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: isMobile ? 16 : 20,
    borderRadius: isMobile ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: isMobile ? undefined : 1,
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(5, 150, 105, 0.25), 0 2px 6px rgba(5, 150, 105, 0.15)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
      shadowOpacity: 0.25,
      shadowRadius: isMobile ? 8 : 10,
      elevation: isMobile ? 6 : 8,
    }),
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  messageButtonWithPay: {
    marginTop: 0,
  },
  invoiceButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: isMobile ? 16 : 20,
    borderRadius: isMobile ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: isMobile ? undefined : 1,
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25), 0 2px 6px rgba(245, 158, 11, 0.15)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#F59E0B',
      shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
      shadowOpacity: 0.25,
      shadowRadius: isMobile ? 8 : 10,
      elevation: isMobile ? 6 : 8,
    }),
  },
  invoiceButtonWithPay: {
    marginTop: 0,
  },
  invoiceButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelButton: {
    flex: isMobile ? undefined : 1,
    backgroundColor: '#DC2626',
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: isMobile ? 16 : 20,
    borderRadius: isMobile ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: isMobile ? (screenWidth - 40) / 2 : undefined,
    minWidth: isMobile ? undefined : 140,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(220, 38, 38, 0.25), 0 2px 6px rgba(220, 38, 38, 0.15)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: isMobile ? 4 : 6 },
      shadowOpacity: 0.25,
      shadowRadius: isMobile ? 8 : 10,
      elevation: isMobile ? 6 : 8,
    }),
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
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
  cancelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cancelModalTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  cancelModalCloseButton: {
    padding: 4,
  },
  cancelModalCloseIcon: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    color: '#64748B',
    fontWeight: 'bold',
  },
  cancelModalBody: {
    padding: Platform.OS === 'web' ? 24 : 20,
  },
  cancelModalMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    lineHeight: Platform.OS === 'web' ? 24 : 22,
    fontWeight: '600',
  },
  cancelModalSubMessage: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748B',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
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
  cancelModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 24 : 20,
    paddingTop: Platform.OS === 'web' ? 0 : 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelModalButton: {
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    minWidth: Platform.OS === 'web' ? 100 : 80,
    alignItems: 'center',
  },
  cancelModalBackButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelModalBackButtonText: {
    color: '#64748B',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  cancelModalConfirmButton: {
    backgroundColor: '#ef4444',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  cancelModalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
});

export default BookingView;


