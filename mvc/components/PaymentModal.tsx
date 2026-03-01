import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getApiBaseUrl } from '../services/api';
import { getShadowStyle } from '../utils/shadowStyles';
import { colors, semantic } from '../theme';
import { useBreakpoints } from '../hooks/useBreakpoints';
import {
  usePaymentSchedule,
  usePayDepositMutation,
  usePayBalanceMutation,
  type PaymentScheduleItem,
} from '../hooks/usePaymentSchedule';

interface PaymentModalProps {
  visible: boolean;
  booking: {
    id: string;
    title: string;
    totalCost: number;
    date: string;
    time: string;
  };
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  booking,
  userEmail,
  onClose,
  onSuccess,
}) => {
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'paymongo' | 'cash'>('paymongo');
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  // Fetch payment schedule for deposit/balance split
  const { data: schedule, isLoading: scheduleLoading } = usePaymentSchedule(booking.id);

  const payDepositMutation = usePayDepositMutation();
  const payBalanceMutation = usePayBalanceMutation();

  // Determine schedule items
  const depositItem = schedule?.find((s: PaymentScheduleItem) => s.type === 'deposit');
  const balanceItem = schedule?.find((s: PaymentScheduleItem) => s.type === 'balance');
  const hasSchedule = !!(depositItem || balanceItem);

  const isDepositPending = !!(
    depositItem &&
    (depositItem.status === 'pending' || depositItem.status === 'overdue')
  );
  const isBalancePending = !!(
    balanceItem &&
    (balanceItem.status === 'pending' || balanceItem.status === 'overdue')
  );
  const isFullyPaid = hasSchedule && !isDepositPending && !isBalancePending;

  // Compute deposit percentage for display
  const depositPercent =
    hasSchedule && depositItem ? Math.round((depositItem.amount / booking.totalCost) * 100) : 0;

  // The amount that the current payment action will charge
  const currentPaymentAmount = isDepositPending
    ? depositItem!.amount
    : isBalancePending
      ? balanceItem!.amount
      : booking.totalCost;

  const currentPaymentLabel = isDepositPending
    ? 'Deposit'
    : isBalancePending
      ? 'Balance'
      : 'Payment';

  // Format a due date string for display
  const formatDueDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Handle deposit/balance payment via hooks
  const handleScheduledPayment = async () => {
    setErrorMessage('');

    if (isDepositPending) {
      try {
        setProcessing(true);
        const result = await payDepositMutation.mutateAsync({
          bookingId: booking.id,
          paymentMethod,
        });

        if (result?.checkoutUrl && paymentMethod === 'paymongo') {
          // Redirect to PayMongo checkout
          onClose();
          onSuccess();
          redirectToPayment(result.checkoutUrl);
        } else if (paymentMethod === 'cash') {
          onClose();
          Alert.alert(
            'Deposit Recorded',
            `Your cash deposit of ₱${(depositItem?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} has been recorded. Please bring the exact amount when you meet the provider.`,
            [{ text: 'OK', onPress: () => onSuccess() }],
          );
        } else {
          // PayMongo without checkout URL — payment was recorded
          onClose();
          Alert.alert('Deposit Recorded', result?.message || 'Deposit payment has been recorded.', [
            { text: 'OK', onPress: () => onSuccess() },
          ]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to process deposit payment.';
        if (msg.includes('not yet set up') || msg.includes('Provider not yet')) {
          setErrorMessage('Provider not yet set up his payment');
        } else {
          setErrorMessage(msg);
        }
      } finally {
        setProcessing(false);
      }
    } else if (isBalancePending) {
      try {
        setProcessing(true);
        const result = await payBalanceMutation.mutateAsync({
          bookingId: booking.id,
          paymentMethod,
        });

        if (result?.checkoutUrl && paymentMethod === 'paymongo') {
          onClose();
          onSuccess();
          redirectToPayment(result.checkoutUrl);
        } else if (paymentMethod === 'cash') {
          onClose();
          Alert.alert(
            'Balance Recorded',
            `Your cash balance of ₱${(balanceItem?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} has been recorded. Please bring the exact amount when you meet the provider.`,
            [{ text: 'OK', onPress: () => onSuccess() }],
          );
        } else {
          onClose();
          Alert.alert('Balance Recorded', result?.message || 'Balance payment has been recorded.', [
            { text: 'OK', onPress: () => onSuccess() },
          ]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to process balance payment.';
        if (msg.includes('not yet set up') || msg.includes('Provider not yet')) {
          setErrorMessage('Provider not yet set up his payment');
        } else {
          setErrorMessage(msg);
        }
      } finally {
        setProcessing(false);
      }
    }
  };

  // Shared redirect helper
  const redirectToPayment = (paymentUrl: string) => {
    if (Platform.OS === 'web' || (typeof window !== 'undefined' && window.location)) {
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = paymentUrl;
        } else {
          Alert.alert('Error', 'Cannot redirect to payment page.');
        }
      }, 200);
    } else {
      Linking.openURL(paymentUrl).catch(() => {
        Alert.alert('Error', 'Failed to open payment page. Please try again.');
      });
    }
  };

  const handlePay = async () => {
    setErrorMessage('');

    // If a payment schedule exists, use the deposit/balance mutations
    if (hasSchedule && !isFullyPaid) {
      await handleScheduledPayment();
      return;
    }

    // Legacy flow: single full payment (no schedule or 100% deposit)
    if (paymentMethod === 'cash') {
      await processCashPayment();
    } else {
      await processPayment();
    }
  };

  // ──── Legacy full-amount PayMongo payment ────
  const processPayment = async () => {
    try {
      setProcessing(true);

      const apiUrl = `${getApiBaseUrl()}/api/bookings/${booking.id}/pay`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok && data.paymentUrl) {
        onClose();
        onSuccess();
        redirectToPayment(data.paymentUrl);
      } else {
        const msg = data?.error || data?.message || 'Failed to create payment. Please try again.';
        if (msg.includes('not yet set up') || msg.includes('Provider not yet')) {
          setErrorMessage('Provider not yet set up his payment');
        } else {
          setErrorMessage(msg);
        }
        setProcessing(false);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Payment Error',
        `Failed to process payment: ${msg}\n\nPlease check:\n1. Server is running\n2. PayMongo credentials are configured\n3. Network connection is active`,
      );
      setProcessing(false);
    }
  };

  // ──── Legacy full-amount cash payment ────
  const processCashPayment = async () => {
    try {
      setProcessing(true);

      const apiUrl = `${getApiBaseUrl()}/api/bookings/${booking.id}/pay-cash`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        onClose();
        Alert.alert(
          'Payment Recorded',
          'Your cash payment has been recorded. Please bring the exact amount when you meet the provider.',
          [{ text: 'OK', onPress: () => onSuccess() }],
        );
      } else {
        const msg =
          data?.error || data?.message || 'Failed to record cash payment. Please try again.';
        setErrorMessage(msg);
        setProcessing(false);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Payment Error',
        `Failed to process cash payment: ${msg}\n\nPlease check:\n1. Server is running\n2. Network connection is active`,
      );
      setProcessing(false);
    }
  };

  // Clear error when modal opens
  useEffect(() => {
    if (visible) {
      setErrorMessage('');
      setProcessing(false);
    }
  }, [visible]);

  // Determine button label
  const getPayButtonText = (): string => {
    if (hasSchedule && !isFullyPaid) {
      const amount = currentPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 });
      if (paymentMethod === 'cash') {
        return `Confirm Cash ${currentPaymentLabel} ₱${amount}`;
      }
      return `Pay ${currentPaymentLabel} ₱${amount}`;
    }
    // Legacy
    if (paymentMethod === 'cash') {
      return `Confirm Cash Payment ₱${booking.totalCost.toLocaleString()}`;
    }
    return `Pay ₱${booking.totalCost.toLocaleString()}`;
  };

  // Determine the cash info amount text
  const getCashInfoAmount = (): string => {
    if (hasSchedule && !isFullyPaid) {
      return `₱${currentPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `₱${booking.totalCost.toLocaleString()}`;
  };

  // Header title
  const headerTitle =
    hasSchedule && !isFullyPaid
      ? `Pay ${currentPaymentLabel}`
      : isFullyPaid
        ? 'Payment Complete'
        : 'Payment';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close payment modal"
          >
            <Feather name="x" size={22} color={semantic.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                onPress={() => setErrorMessage('')}
                style={styles.errorCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Dismiss error message"
              >
                <Feather name="x" size={18} color={colors.error[600]} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Schedule loading state */}
          {scheduleLoading && (
            <View style={styles.scheduleLoadingContainer}>
              <ActivityIndicator size="small" color={semantic.primary} />
              <Text style={styles.scheduleLoadingText}>Loading payment details...</Text>
            </View>
          )}

          {/* Booking Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Event:</Text>
              <Text style={styles.summaryValue}>{booking.title}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{booking.date}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{booking.time}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>₱{booking.totalCost.toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment Schedule Breakdown */}
          {hasSchedule && depositItem && balanceItem && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Payment Schedule</Text>

              {/* Deposit row */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <Feather
                    name={depositItem.status === 'paid' ? 'check-circle' : 'circle'}
                    size={16}
                    color={depositItem.status === 'paid' ? colors.success[500] : semantic.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.breakdownLabel}>Deposit ({depositPercent}%)</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownAmount}>
                    ₱{depositItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  <Text
                    style={[
                      styles.breakdownStatus,
                      depositItem.status === 'paid' && styles.statusPaid,
                      depositItem.status === 'overdue' && styles.statusOverdue,
                    ]}
                  >
                    {depositItem.status === 'paid'
                      ? 'Paid'
                      : depositItem.status === 'overdue'
                        ? 'Overdue'
                        : 'Due now'}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.breakdownDivider} />

              {/* Balance row */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <Feather
                    name={balanceItem.status === 'paid' ? 'check-circle' : 'circle'}
                    size={16}
                    color={balanceItem.status === 'paid' ? colors.success[500] : semantic.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.breakdownLabel}>Balance</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownAmount}>
                    ₱{balanceItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  <Text
                    style={[
                      styles.breakdownStatus,
                      balanceItem.status === 'paid' && styles.statusPaid,
                      balanceItem.status === 'overdue' && styles.statusOverdue,
                    ]}
                  >
                    {balanceItem.status === 'paid'
                      ? 'Paid'
                      : balanceItem.status === 'overdue'
                        ? 'Overdue'
                        : isDepositPending
                          ? `Due by ${formatDueDate(balanceItem.dueDate)}`
                          : 'Due now'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Fully Paid Notice */}
          {isFullyPaid && (
            <View style={styles.fullyPaidCard}>
              <Feather
                name="check-circle"
                size={24}
                color={colors.success[600]}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.fullyPaidTitle}>Fully Paid</Text>
                <Text style={styles.fullyPaidText}>
                  All payments for this booking have been completed.
                </Text>
              </View>
            </View>
          )}

          {/* Payment Method Selection — only show if payment is still needed */}
          {!isFullyPaid && (
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'paymongo' && styles.paymentMethodCardActive,
                  ]}
                  onPress={() => setPaymentMethod('paymongo')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Select online payment via PayMongo"
                  accessibilityState={{ selected: paymentMethod === 'paymongo' }}
                >
                  <View style={styles.paymentMethodContent}>
                    <Feather
                      name="credit-card"
                      size={28}
                      color={colors.primary[500]}
                      style={{ marginRight: 12 }}
                    />
                    <View style={styles.paymentMethodTextContainer}>
                      <Text
                        style={[
                          styles.paymentMethodTitle,
                          paymentMethod === 'paymongo' && styles.paymentMethodTitleActive,
                        ]}
                      >
                        Online Payment (PayMongo)
                      </Text>
                      <Text
                        style={[
                          styles.paymentMethodDescription,
                          paymentMethod === 'paymongo' && styles.paymentMethodDescriptionActive,
                        ]}
                      >
                        Pay securely via GCash or other online methods
                      </Text>
                    </View>
                    {paymentMethod === 'paymongo' && (
                      <View style={styles.radioButton}>
                        <View style={styles.radioButtonInner} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === 'cash' && styles.paymentMethodCardActive,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Select cash on hand payment"
                  accessibilityState={{ selected: paymentMethod === 'cash' }}
                >
                  <View style={styles.paymentMethodContent}>
                    <Feather
                      name="dollar-sign"
                      size={28}
                      color={colors.success[500]}
                      style={{ marginRight: 12 }}
                    />
                    <View style={styles.paymentMethodTextContainer}>
                      <Text
                        style={[
                          styles.paymentMethodTitle,
                          paymentMethod === 'cash' && styles.paymentMethodTitleActive,
                        ]}
                      >
                        Cash on Hand
                      </Text>
                      <Text
                        style={[
                          styles.paymentMethodDescription,
                          paymentMethod === 'cash' && styles.paymentMethodDescriptionActive,
                        ]}
                      >
                        Pay with cash when you meet the provider
                      </Text>
                    </View>
                    {paymentMethod === 'cash' && (
                      <View style={styles.radioButton}>
                        <View style={styles.radioButtonInner} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Payment Info */}
          {!isFullyPaid && paymentMethod === 'paymongo' && (
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  You will be redirected to PayMongo to complete your payment securely.
                </Text>
                <Text style={styles.infoSubtext}>
                  Click the button below to proceed to the payment page.
                </Text>
              </View>
            </View>
          )}

          {!isFullyPaid && paymentMethod === 'cash' && (
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Cash Payment Information</Text>
              <View style={styles.cashInfoCard}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}
                >
                  <Feather name="dollar-sign" size={16} color="#166534" />
                  <Text style={[styles.cashInfoText, { marginBottom: 0 }]}>
                    You will pay with cash directly to the provider when you meet them.
                  </Text>
                </View>
                <Text style={styles.cashInfoSubtext}>
                  Make sure to bring the exact amount: {getCashInfoAmount()}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons — only show if not fully paid */}
        {!isFullyPaid && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={handlePay}
              disabled={processing || scheduleLoading}
              accessibilityRole="button"
              accessibilityLabel={getPayButtonText()}
              accessibilityState={{ disabled: processing || scheduleLoading }}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>{getPayButtonText()}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Close button when fully paid */}
        {isFullyPaid && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: semantic.primary }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close payment modal"
            >
              <Text style={styles.payButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semantic.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isMobile ? 16 : 20,
      paddingVertical: 16,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
      ...getShadowStyle(0.1, 2, 1),
    },
    closeButton: {
      padding: 8,
    },
    closeButtonText: {
      fontSize: 24,
      color: semantic.textSecondary,
      fontWeight: '300',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
    },
    placeholder: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: semantic.textSecondary,
    },
    scheduleLoadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginBottom: 16,
    },
    scheduleLoadingText: {
      marginLeft: 10,
      fontSize: 14,
      color: semantic.textSecondary,
    },
    content: {
      flex: 1,
      padding: isMobile ? 16 : 20,
    },
    summaryCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 16 : 20,
      marginBottom: 24,
      ...getShadowStyle(0.1, 4, 2),
    },
    summaryTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    totalRow: {
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: semantic.textPrimary,
    },
    totalValue: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: 'bold',
      color: semantic.success,
    },
    // ── Payment Schedule Breakdown ──
    breakdownCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 16 : 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: semantic.border,
      ...getShadowStyle(0.08, 2, 2),
    },
    breakdownTitle: {
      fontSize: isMobile ? 15 : 16,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 16,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    breakdownLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    breakdownRight: {
      alignItems: 'flex-end',
    },
    breakdownLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: semantic.textPrimary,
    },
    breakdownAmount: {
      fontSize: 15,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 2,
    },
    breakdownStatus: {
      fontSize: 12,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    statusPaid: {
      color: colors.success[600],
    },
    statusOverdue: {
      color: colors.error[600],
    },
    breakdownDivider: {
      height: 1,
      backgroundColor: semantic.borderLight,
      marginVertical: 4,
    },
    // ── Fully Paid ──
    fullyPaidCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success[50],
      borderRadius: 12,
      padding: isMobile ? 16 : 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.success[100],
    },
    fullyPaidTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.success[700],
      marginBottom: 4,
    },
    fullyPaidText: {
      fontSize: 14,
      color: colors.success[600],
      lineHeight: 20,
    },
    // ── Existing styles ──
    paymentSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 'bold',
      color: semantic.textPrimary,
      marginBottom: 16,
    },
    infoCard: {
      backgroundColor: colors.primary[50],
      borderRadius: 12,
      padding: isMobile ? 16 : 20,
    },
    infoText: {
      fontSize: 16,
      color: colors.primary[600],
      marginBottom: 8,
      lineHeight: 22,
    },
    infoSubtext: {
      fontSize: 14,
      color: colors.primary[700],
      lineHeight: 20,
    },
    actions: {
      padding: isMobile ? 16 : 20,
      backgroundColor: semantic.surface,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      ...getShadowStyle(0.1, -2, 2),
    },
    payButton: {
      backgroundColor: semantic.success,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
      ...getShadowStyle(0.2, 4, 2),
    },
    payButtonDisabled: {
      backgroundColor: semantic.textMuted,
      ...getShadowStyle(0, 0, 0),
    },
    payButtonText: {
      color: semantic.surface,
      fontSize: 16,
      fontWeight: 'bold',
    },
    errorCard: {
      backgroundColor: colors.error[50],
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.error[100],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: {
      fontSize: 14,
      color: colors.error[600],
      fontWeight: '600',
      flex: 1,
    },
    errorCloseButton: {
      padding: 4,
      marginLeft: 8,
    },
    errorCloseText: {
      color: colors.error[600],
      fontSize: 20,
      fontWeight: 'bold',
      lineHeight: 20,
    },
    paymentMethodContainer: {
      gap: 12,
    },
    paymentMethodCard: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      padding: isMobile ? 12 : 16,
      borderWidth: 2,
      borderColor: semantic.border,
      ...getShadowStyle(0.1, 2, 2),
    },
    paymentMethodCardActive: {
      borderColor: semantic.primary,
      backgroundColor: colors.primary[50],
    },
    paymentMethodContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    paymentMethodIcon: {
      fontSize: 32,
      marginRight: 12,
    },
    paymentMethodTextContainer: {
      flex: 1,
    },
    paymentMethodTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 4,
    },
    paymentMethodTitleActive: {
      color: semantic.primary,
    },
    paymentMethodDescription: {
      fontSize: 14,
      color: semantic.textSecondary,
      lineHeight: 20,
    },
    paymentMethodDescriptionActive: {
      color: semantic.primary,
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: semantic.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    radioButtonInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: semantic.primary,
    },
    cashInfoCard: {
      backgroundColor: colors.success[50],
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.success[100],
    },
    cashInfoText: {
      fontSize: 16,
      color: colors.success[700],
      marginBottom: 8,
      lineHeight: 22,
      fontWeight: '600',
    },
    cashInfoSubtext: {
      fontSize: 14,
      color: colors.success[600],
      lineHeight: 20,
    },
  });
