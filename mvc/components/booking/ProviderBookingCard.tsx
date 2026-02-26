import React from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/provider/BookingsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { getStatusColor, type ProviderBooking } from '../../hooks/useProviderBookings';

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

    const MarkAsPaidButton: React.FC<{
      bookingId: string;
      onMarkPaymentAsPaid: (bookingId: string) => void;
    }> = ({ bookingId, onMarkPaymentAsPaid }) => (
      <TouchableOpacity
        style={[styles.tableActionButton, styles.paidButton]}
        onPress={() => {
          if (Platform.OS === 'web') {
            const confirmed = window.confirm('Mark this cash payment as paid?');
            if (confirmed) {
              onMarkPaymentAsPaid(bookingId);
            }
          } else {
            Alert.alert(
              'Mark Payment as Paid',
              'Have you received the cash payment from the customer?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Mark as Paid',
                  onPress: () => onMarkPaymentAsPaid(bookingId),
                },
              ],
            );
          }
        }}
      >
        <Text style={styles.tableActionButtonText}>Paid</Text>
      </TouchableOpacity>
    );

    const InvoiceButton: React.FC<{
      bookingId: string;
      onDownloadInvoice: (bookingId: string) => void;
    }> = ({ bookingId, onDownloadInvoice }) => (
      <TouchableOpacity
        style={[styles.tableActionButton, styles.invoiceButton]}
        onPress={() => onDownloadInvoice(bookingId)}
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
              >
                <Text style={styles.tableActionButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tableActionButton, styles.cancelButton]}
                onPress={() => onCancelClick(booking.id)}
                activeOpacity={0.7}
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
