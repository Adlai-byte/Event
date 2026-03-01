import React from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/provider/BookingsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { getStatusColor, type ProviderBooking } from '../../hooks/useProviderBookings';
import { colors } from '../../theme';

export interface ProviderBookingCardProps {
  booking: ProviderBooking;
  isMobile: boolean;
  onConfirmClick: (bookingId: string) => void;
  onCancelClick: (bookingId: string) => void;
  onCompleteClick: (bookingId: string) => void;
  onMarkPaymentAsPaid: (bookingId: string) => void;
  onDownloadInvoice: (bookingId: string) => void;
  onViewClientDetails?: (booking: ProviderBooking) => void;
}

/**
 * Returns the payment status badge config for a provider booking.
 */
function getPaymentBadge(booking: ProviderBooking): {
  label: string;
  bgColor: string;
  textColor: string;
  icon: keyof typeof Feather.glyphMap;
} | null {
  if (booking.status === 'cancelled') {
    return null;
  }

  // Fully paid
  if (booking.isPaid && (booking.status === 'confirmed' || booking.status === 'completed')) {
    return {
      label: 'Fully Paid',
      bgColor: colors.success[50],
      textColor: colors.success[700],
      icon: 'check-circle',
    };
  }

  // Deposit not yet paid
  if (
    booking.depositPaid === false &&
    booking.status === 'pending' &&
    booking.depositPaid !== undefined
  ) {
    return {
      label: 'Deposit Due',
      bgColor: colors.warning[50],
      textColor: colors.warning[600],
      icon: 'clock',
    };
  }

  // Deposit paid, balance pending
  if (booking.depositPaid === true && !booking.isPaid) {
    const balanceLabel = booking.balanceDueDate
      ? `Balance Due ${formatDueDate(booking.balanceDueDate)}`
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

export const ProviderBookingCard: React.FC<ProviderBookingCardProps> = React.memo(
  ({
    booking,
    isMobile,
    onConfirmClick,
    onCancelClick,
    onCompleteClick,
    onMarkPaymentAsPaid,
    onDownloadInvoice,
    onViewClientDetails,
  }) => {
    const { isMobile: isMobileBreakpoint, screenWidth } = useBreakpoints();
    const styles = createStyles(isMobileBreakpoint, screenWidth);
    const statusColor = getStatusColor(booking.status);
    const paymentBadge = getPaymentBadge(booking);

    const MarkAsPaidButton: React.FC<{
      bookingId: string;
      onMarkPaymentAsPaid: (bookingId: string) => void;
    }> = ({ bookingId, onMarkPaymentAsPaid: handleMarkPaid }) => (
      <TouchableOpacity
        style={[styles.tableActionButton, styles.paidButton]}
        onPress={() => {
          if (Platform.OS === 'web') {
            const confirmed = window.confirm('Mark this cash payment as paid?');
            if (confirmed) {
              handleMarkPaid(bookingId);
            }
          } else {
            Alert.alert(
              'Mark Payment as Paid',
              'Have you received the cash payment from the customer?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Mark as Paid',
                  onPress: () => handleMarkPaid(bookingId),
                },
              ],
            );
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Mark payment as paid"
      >
        <Text style={styles.tableActionButtonText}>Paid</Text>
      </TouchableOpacity>
    );

    const InvoiceButton: React.FC<{
      bookingId: string;
      onDownloadInvoice: (bookingId: string) => void;
    }> = ({ bookingId, onDownloadInvoice: handleDownload }) => (
      <TouchableOpacity
        style={[styles.tableActionButton, styles.invoiceButton]}
        onPress={() => handleDownload(bookingId)}
        accessibilityRole="button"
        accessibilityLabel="Download invoice"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="file-text" size={12} color="#fff" />
          <Text style={styles.tableActionButtonText}>Invoice</Text>
        </View>
      </TouchableOpacity>
    );

    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 2 }]}>
          <Text style={styles.tableCellEventName}>{booking.eventName}</Text>
          <Text style={styles.tableCellServiceName}>{booking.serviceName}</Text>
          {/* Payment badge in table cell */}
          {paymentBadge && (
            <View
              style={[badgeStyles.paymentBadge, { backgroundColor: paymentBadge.bgColor }]}
              accessibilityLabel={`Payment status: ${paymentBadge.label}`}
            >
              <Feather name={paymentBadge.icon} size={10} color={paymentBadge.textColor} />
              <Text style={[badgeStyles.paymentBadgeText, { color: paymentBadge.textColor }]}>
                {paymentBadge.label}
              </Text>
            </View>
          )}
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
          <Text style={styles.tableCellText} numberOfLines={1}>
            {booking.location}
          </Text>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <Text style={[styles.tableCellText, styles.tableCellPrice]}>
            ₱{booking.totalCost.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.tableCell, { flex: 0.8 }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellActions, { flex: 1.5 }]}>
          {/* Desktop-only view details button */}
          {!isMobile && onViewClientDetails && (
            <TouchableOpacity
              style={[styles.tableActionButton, styles.viewDetailsButton]}
              onPress={() => onViewClientDetails(booking)}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${booking.eventName}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="eye" size={12} color="#fff" />
                <Text style={styles.tableActionButtonText}>Details</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Pending actions */}
          {booking.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.tableActionButton, styles.confirmButton]}
                onPress={() => onConfirmClick(booking.id)}
                accessibilityRole="button"
                accessibilityLabel="Confirm booking"
              >
                <Text style={styles.tableActionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tableActionButton, styles.cancelButton]}
                onPress={() => onCancelClick(booking.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel booking"
              >
                <Text style={styles.tableActionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Confirmed actions */}
          {booking.status === 'confirmed' && (
            <>
              {booking.hasPendingCashPayment && (
                <MarkAsPaidButton
                  bookingId={booking.id}
                  onMarkPaymentAsPaid={onMarkPaymentAsPaid}
                />
              )}
              <TouchableOpacity
                style={[styles.tableActionButton, styles.completeButton]}
                onPress={() => onCompleteClick(booking.id)}
                accessibilityRole="button"
                accessibilityLabel="Complete booking"
              >
                <Text style={styles.tableActionButtonText}>Complete</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Completed actions */}
          {booking.status === 'completed' && (
            <>
              {booking.isPaid ? (
                <InvoiceButton bookingId={booking.id} onDownloadInvoice={onDownloadInvoice} />
              ) : (
                <Text style={styles.tableCellText}>-</Text>
              )}
            </>
          )}

          {/* Invoice for confirmed + paid */}
          {booking.status === 'confirmed' && booking.isPaid && (
            <InvoiceButton bookingId={booking.id} onDownloadInvoice={onDownloadInvoice} />
          )}

          {/* Cancelled - no actions */}
          {booking.status === 'cancelled' && <Text style={styles.tableCellText}>-</Text>}
        </View>
      </View>
    );
  },
);

const badgeStyles = StyleSheet.create({
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  paymentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
});
