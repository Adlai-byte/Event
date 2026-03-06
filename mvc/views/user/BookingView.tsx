import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonListItem } from '../../components/ui';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { PaymentModal } from '../../components/PaymentModal';
import { EditBookingModal } from '../../components/EditBookingModal';
import { RatingModal } from '../../components/RatingModal';
import {
  BookingCard,
  EventDetailsModal,
  CancelBookingModal,
  type Booking,
} from '../../components/booking';
import { useBookingData } from '../../hooks/useBookingData';
import { createStyles } from './BookingView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

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

export const BookingView: React.FC<BookingViewProps> = ({
  userId: _userId,
  userEmail,
  user,
  onNavigate,
  onLogout,
  onNavigateToBookingDetails: _onNavigateToBookingDetails,
  onNavigateToEditEvent: _onNavigateToEditEvent,
  onNavigateToMessages,
  refreshKey,
}) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = useMemo(
    () => createStyles(isMobile, screenWidth, screenHeight),
    [isMobile, screenWidth, screenHeight],
  );

  const { bookings, loading, serviceRatings, loadBookings, loadServiceRatings } = useBookingData({
    userEmail,
    refreshKey,
  });

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'cancelled' | 'completed'>(
    'all',
  );
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingService, setRatingService] = useState<{
    serviceId: number;
    serviceName: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  const handleViewDetails = useCallback(
    (booking: Booking) => {
      setSelectedBooking(booking);
      setShowEventDetails(true);
      // Load ratings for services in this booking if it's completed
      if (booking.bookingStatus === 'completed' && userEmail) {
        loadServiceRatings(booking.id, booking.services || []);
      }
    },
    [userEmail, loadServiceRatings],
  );

  const handleRateService = (serviceId: number, serviceName: string) => {
    setRatingService({ serviceId, serviceName });
    setShowRatingModal(true);
  };

  const handleRatingSuccess = () => {
    if (selectedBooking && ratingService) {
      loadServiceRatings(selectedBooking.id, selectedBooking.services || []);
    }
  };

  const handleEditEvent = useCallback(
    (bookingId: string) => {
      const booking = bookings.find((b: Booking) => b.id === bookingId);
      if (!booking) {
        Alert.alert('Error', 'Booking not found');
        return;
      }
      if (booking.isPaid) {
        Alert.alert('Cannot Edit', 'This booking has already been paid and cannot be edited.');
        return;
      }
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
    },
    [bookings],
  );

  const handleCancelEvent = useCallback((booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(booking.dateStr || booking.date);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      Alert.alert('Cannot Cancel', 'This booking is in the past and cannot be canceled.');
      return;
    }
    setBookingToCancel(booking);
    setShowCancelModal(true);
  }, []);

  const handleCancelSuccess = useCallback(() => {
    loadBookings();
    setShowEventDetails(false);
    setShowCancelModal(false);
    setBookingToCancel(null);
  }, [loadBookings]);

  const handlePay = useCallback((booking: Booking) => {
    setPaymentBooking(booking);
    setShowPaymentModal(true);
  }, []);

  const handlePaymentSuccess = () => {
    if (userEmail) {
      loadBookings();
    }
  };

  const handleMessageProvider = useCallback(
    async (bookingId: string) => {
      if (!userEmail) {
        Alert.alert('Error', 'User email is required');
        return;
      }

      try {
        const resp = await fetch(`${getApiBaseUrl()}/api/bookings/${bookingId}/conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userEmail }),
        });

        const data = await resp.json();

        if (resp.ok && data.ok && data.conversation) {
          const conversationId = data.conversation.idconversation.toString();
          if (onNavigateToMessages) {
            onNavigateToMessages(conversationId);
          }
        } else {
          Alert.alert('Error', data.error || 'Failed to start conversation');
        }
      } catch (error) {
        if (__DEV__) console.error('Error creating conversation:', error);
        Alert.alert('Error', 'Failed to start conversation. Please try again.');
      }
    },
    [userEmail, onNavigateToMessages],
  );

  // Filter bookings based on active filter
  const filteredBookings = useMemo(() => {
    switch (activeFilter) {
      case 'paid':
        return bookings.filter((b: Booking) => b.isPaid === true);
      case 'cancelled':
        return bookings.filter((b: Booking) => b.bookingStatus === 'cancelled');
      case 'completed':
        return bookings.filter((b: Booking) => b.bookingStatus === 'completed');
      case 'all':
      default:
        return bookings;
    }
  }, [bookings, activeFilter]);

  const upcomingBookings = useMemo(
    () =>
      filteredBookings.filter(
        (b: Booking) =>
          b.status === 'upcoming' &&
          b.bookingStatus !== 'cancelled' &&
          b.bookingStatus !== 'completed',
      ),
    [filteredBookings],
  );
  const completedBookings = useMemo(
    () => filteredBookings.filter((b: Booking) => b.bookingStatus === 'completed'),
    [filteredBookings],
  );
  const cancelledBookings = useMemo(
    () => filteredBookings.filter((b: Booking) => b.bookingStatus === 'cancelled'),
    [filteredBookings],
  );
  const pastBookings = useMemo(
    () =>
      filteredBookings.filter(
        (b: Booking) =>
          b.status === 'past' && b.bookingStatus !== 'cancelled' && b.bookingStatus !== 'completed',
      ),
    [filteredBookings],
  );

  const orderedBookings = useMemo(
    () => [...upcomingBookings, ...cancelledBookings, ...completedBookings, ...pastBookings],
    [upcomingBookings, cancelledBookings, completedBookings, pastBookings],
  );

  const getSectionTitle = useCallback(
    (booking: Booking): 'Upcoming' | 'Completed' | 'Cancelled' | 'Past' => {
      if (booking.bookingStatus === 'cancelled') return 'Cancelled';
      if (booking.bookingStatus === 'completed' || booking.status === 'completed')
        return 'Completed';
      if (booking.status === 'upcoming') return 'Upcoming';
      return 'Past';
    },
    [],
  );

  if (loading) {
    return (
      <AppLayout
        role="user"
        activeRoute="bookings"
        title="Bookings"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <View style={{ padding: 16 }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </View>
      </AppLayout>
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
            {(['all', 'paid', 'cancelled', 'completed'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
                onPress={() => setActiveFilter(filter)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${filter}`}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter && styles.filterButtonTextActive,
                  ]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List View */}
        <View style={styles.content}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Feather name="calendar" size={48} color="#94A3B8" />
              </View>
              <Text style={styles.emptyStateText}>
                {activeFilter === 'all' ? 'No bookings yet' : `No ${activeFilter} bookings`}
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
                    {showSectionHeader && <Text style={styles.sectionTitle}>{sectionTitle}</Text>}
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
            existingRating={
              ratingService.serviceId ? serviceRatings[ratingService.serviceId] : null
            }
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
              startTime: editingBooking.startTime ?? '',
              endTime: editingBooking.endTime ?? '',
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
        {bookingToCancel && (
          <CancelBookingModal
            visible={showCancelModal}
            bookingId={parseInt(bookingToCancel.id, 10)}
            serviceName={bookingToCancel.title}
            onClose={() => {
              setShowCancelModal(false);
              setBookingToCancel(null);
            }}
            onCancelled={handleCancelSuccess}
          />
        )}
      </View>
    </AppLayout>
  );
};

export default BookingView;
