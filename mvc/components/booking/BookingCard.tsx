import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/user/BookingView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic } from '../../theme';
import type { Booking } from './types';

export interface BookingCardProps {
  booking: Booking;
  onViewDetails: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onPay?: () => void;
  isPast?: boolean;
}

/**
 * Returns the payment status badge config for a booking.
 * Backward compatible: only shows badge if deposit/payment fields exist.
 */
function getPaymentBadge(booking: Booking): {
  label: string;
  bgColor: string;
  textColor: string;
  icon: keyof typeof Feather.glyphMap;
} | null {
  // Cancelled bookings get a cancelled badge (already handled in badgeContainer)
  if (booking.bookingStatus === 'cancelled') {
    return null;
  }

  // Fully paid
  if (booking.isPaid && booking.bookingStatus === 'confirmed') {
    return {
      label: 'Fully Paid',
      bgColor: colors.success[50],
      textColor: colors.success[700],
      icon: 'check-circle',
    };
  }

  // Deposit not yet paid, booking is pending
  if (
    booking.depositPaid === false &&
    booking.bookingStatus === 'pending' &&
    booking.depositPaid !== undefined
  ) {
    return {
      label: 'Deposit Due',
      bgColor: colors.warning[50],
      textColor: colors.warning[600],
      icon: 'clock',
    };
  }

  // Deposit paid but balance still pending
  if (booking.depositPaid === true && !booking.isPaid) {
    const balanceLabel = booking.balanceDueDate
      ? `Balance Due by ${formatDueDate(booking.balanceDueDate)}`
      : 'Balance Due';
    return {
      label: balanceLabel,
      bgColor: colors.primary[50],
      textColor: colors.primary[600],
      icon: 'calendar',
    };
  }

  return null;
}

function formatDueDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const BookingCard: React.FC<BookingCardProps> = React.memo(
  ({ booking, onViewDetails, onEdit: _onEdit, onCancel, onPay, isPast: _isPast = false }) => {
    const { isMobile, screenWidth, screenHeight } = useBreakpoints();
    const styles = createStyles(isMobile, screenWidth, screenHeight);
    const badgeStyles = createBadgeStyles(isMobile);
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

    // Show cancel button for non-cancelled, non-completed, non-past bookings
    const showCancelButton =
      booking.bookingStatus !== 'cancelled' &&
      booking.bookingStatus !== 'completed' &&
      !bookingIsPast;

    // Payment status badge
    const paymentBadge = useMemo(() => getPaymentBadge(booking), [booking]);

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

          {/* Payment Status Badge */}
          {paymentBadge && (
            <View
              style={[badgeStyles.paymentBadge, { backgroundColor: paymentBadge.bgColor }]}
              accessibilityLabel={`Payment status: ${paymentBadge.label}`}
            >
              <Feather name={paymentBadge.icon} size={12} color={paymentBadge.textColor} />
              <Text style={[badgeStyles.paymentBadgeText, { color: paymentBadge.textColor }]}>
                {paymentBadge.label}
              </Text>
            </View>
          )}

          <Text style={styles.bookingDateTime}>
            {booking.date}
            {booking.time ? ` • ${booking.time}` : ''}
          </Text>

          <Text style={styles.bookingDescription}>{booking.description}</Text>

          <View style={styles.bookingActions}>
            {showCancelButton && (
              <TouchableOpacity
                style={badgeStyles.cancelBookingButton}
                onPress={onCancel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Cancel booking ${booking.title}`}
              >
                <Feather name="x-circle" size={12} color={semantic.error} />
                <Text style={badgeStyles.cancelBookingButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {showPayButton && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={onPay}
                accessibilityRole="button"
                accessibilityLabel={`Pay for booking ${booking.title}`}
              >
                <Text style={styles.payButtonText}>PAY</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.viewDetailsButton, showPayButton && styles.viewDetailsButtonWithPay]}
              onPress={onViewDetails}
              accessibilityRole="button"
              accessibilityLabel={`View details for booking ${booking.title}`}
            >
              <Text style={styles.viewDetailsButtonText}>VIEW BOOK DETAILS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

const createBadgeStyles = (isMobile: boolean) =>
  StyleSheet.create({
    paymentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 6,
    },
    paymentBadgeText: {
      fontSize: 11,
      fontWeight: '600',
    },
    cancelBookingButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: isMobile ? 10 : 12,
      paddingVertical: isMobile ? 6 : 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.error[100],
      backgroundColor: colors.error[50],
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }
        : {}),
    },
    cancelBookingButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.error,
    },
  });
