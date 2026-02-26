import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { createStyles } from '../../views/user/BookingView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import type { Booking } from './types';

export interface BookingCardProps {
  booking: Booking;
  onViewDetails: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onPay?: () => void;
  isPast?: boolean;
}

export const BookingCard: React.FC<BookingCardProps> = React.memo(
  ({
    booking,
    onViewDetails,
    onEdit: _onEdit,
    onCancel: _onCancel,
    onPay,
    isPast: _isPast = false,
  }) => {
    const { isMobile, screenWidth, screenHeight } = useBreakpoints();
    const styles = createStyles(isMobile, screenWidth, screenHeight);
    const [imageError, setImageError] = useState(false);

    // Check if booking is in the past (more accurate check using dateStr)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = booking.dateStr ? new Date(booking.dateStr) : new Date(booking.date);
    eventDate.setHours(0, 0, 0, 0);
    const bookingIsPast = eventDate < today;

    // Show pay button only if confirmed, not paid, and not in the past
    const showPayButton =
      booking.bookingStatus === 'confirmed' && !booking.isPaid && !bookingIsPast;

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
            {booking.date}
            {booking.time ? ` • ${booking.time}` : ''}
          </Text>

          <Text style={styles.bookingDescription}>{booking.description}</Text>

          <View style={styles.bookingActions}>
            {showPayButton && (
              <TouchableOpacity style={styles.payButton} onPress={onPay}>
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
  },
);
