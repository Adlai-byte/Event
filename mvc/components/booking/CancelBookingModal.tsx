import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useRefundEstimate, useCancelBookingMutation } from '../../hooks/usePaymentSchedule';
import { colors, semantic } from '../../theme';

export interface CancelBookingModalProps {
  visible: boolean;
  bookingId: number;
  serviceName: string;
  onClose: () => void;
  onCancelled: () => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  visible,
  bookingId,
  serviceName,
  onClose,
  onCancelled,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const [reason, setReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    data: refundEstimate,
    isLoading: estimateLoading,
    isError: estimateError,
  } = useRefundEstimate(bookingId, visible);

  const cancelMutation = useCancelBookingMutation();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setReason('');
      setShowSuccess(false);
    }
  }, [visible]);

  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        bookingId,
        reason: reason.trim() || undefined,
      });
      setShowSuccess(true);
      // Auto-close after brief delay to show success
      setTimeout(() => {
        onCancelled();
        onClose();
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel booking. Please try again.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  if (showSuccess) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <Feather name="check" size={32} color={semantic.surface} />
              </View>
              <Text style={styles.successTitle}>Booking Cancelled</Text>
              <Text style={styles.successMessage}>
                {refundEstimate && refundEstimate.refundAmount > 0
                  ? `A refund of ${formatCurrency(refundEstimate.refundAmount)} will be processed.`
                  : 'Your booking has been cancelled successfully.'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="alert-triangle" size={20} color={semantic.error} />
              <Text style={styles.headerTitle}>Cancel Booking</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close cancel booking modal"
            >
              <Feather name="x" size={22} color={semantic.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Service Name */}
            <View style={styles.serviceNameContainer}>
              <Text style={styles.serviceNameLabel}>Service</Text>
              <Text style={styles.serviceNameValue}>{serviceName}</Text>
            </View>

            {/* Refund Estimate Card */}
            {estimateLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={semantic.primary} />
                <Text style={styles.loadingText}>Calculating refund estimate...</Text>
              </View>
            ) : estimateError ? (
              <View style={styles.estimateCard}>
                <Text style={styles.estimateErrorText}>
                  Unable to calculate refund estimate. You can still proceed with cancellation.
                </Text>
              </View>
            ) : refundEstimate ? (
              <View style={styles.estimateCard}>
                <Text style={styles.estimateTitle}>Refund Calculation</Text>

                <View style={styles.estimateRow}>
                  <Text style={styles.estimateLabel}>Total paid</Text>
                  <Text style={styles.estimateValue}>
                    {formatCurrency(refundEstimate.totalPaid)}
                  </Text>
                </View>

                <View style={styles.estimateRow}>
                  <Text style={styles.estimateLabel}>Days until event</Text>
                  <Text style={styles.estimateValue}>
                    {refundEstimate.daysUntilEvent}{' '}
                    {refundEstimate.daysUntilEvent === 1 ? 'day' : 'days'}
                  </Text>
                </View>

                <View style={styles.estimateDivider} />

                <View style={styles.estimateRow}>
                  <Text style={styles.estimateLabelBold}>Refund amount</Text>
                  <Text
                    style={[
                      styles.estimateValueBold,
                      {
                        color:
                          refundEstimate.refundAmount > 0 ? colors.success[500] : semantic.error,
                      },
                    ]}
                  >
                    {formatCurrency(refundEstimate.refundAmount)} ({refundEstimate.refundPercent}%)
                  </Text>
                </View>

                {/* Refund status highlight */}
                {refundEstimate.refundAmount === 0 ? (
                  <View style={styles.noRefundWarning}>
                    <Feather name="alert-circle" size={16} color={semantic.error} />
                    <Text style={styles.noRefundWarningText}>
                      No refund available based on the cancellation policy
                    </Text>
                  </View>
                ) : (
                  <View style={styles.refundHighlight}>
                    <Feather name="check-circle" size={16} color={colors.success[600]} />
                    <Text style={styles.refundHighlightText}>
                      You will receive a refund of {formatCurrency(refundEstimate.refundAmount)}
                    </Text>
                  </View>
                )}

                {/* Policy message */}
                {refundEstimate.message ? (
                  <View style={styles.policyMessageContainer}>
                    <Feather name="info" size={14} color={semantic.textSecondary} />
                    <Text style={styles.policyMessageText}>{refundEstimate.message}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Reason Input */}
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason for cancellation (optional)</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Tell us why you are cancelling..."
                placeholderTextColor={semantic.textMuted}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Cancellation reason"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.keepButton}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Keep booking"
            >
              <Text style={styles.keepButtonText}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmCancelButton,
                cancelMutation.isPending && styles.confirmCancelButtonDisabled,
              ]}
              onPress={handleConfirmCancel}
              activeOpacity={0.8}
              disabled={cancelMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Confirm cancellation"
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator size="small" color={semantic.surface} />
              ) : (
                <View style={styles.confirmCancelContent}>
                  <Feather name="x-circle" size={16} color={semantic.surface} />
                  <Text style={styles.confirmCancelButtonText}>Confirm Cancellation</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (isMobile: boolean, _screenWidth: number) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? 16 : 20,
    },
    modalContent: {
      backgroundColor: semantic.surface,
      borderRadius: isMobile ? 12 : 16,
      width: isMobile ? '100%' : '90%',
      maxWidth: 520,
      maxHeight: '90%',
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 10,
          }),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? 16 : 20,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    body: {
      flexShrink: 1,
    },
    bodyContent: {
      padding: isMobile ? 16 : 20,
    },
    serviceNameContainer: {
      marginBottom: 16,
    },
    serviceNameLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: semantic.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    serviceNameValue: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '700',
      color: semantic.textPrimary,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: semantic.textSecondary,
    },
    estimateCard: {
      backgroundColor: semantic.background,
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? 14 : 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: semantic.border,
    },
    estimateTitle: {
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 12,
    },
    estimateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    estimateLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    estimateValue: {
      fontSize: 14,
      color: semantic.textPrimary,
      fontWeight: '600',
    },
    estimateDivider: {
      height: 1,
      backgroundColor: semantic.border,
      marginVertical: 8,
    },
    estimateLabelBold: {
      fontSize: 15,
      color: semantic.textPrimary,
      fontWeight: '700',
    },
    estimateValueBold: {
      fontSize: 15,
      fontWeight: '700',
    },
    estimateErrorText: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontStyle: 'italic',
    },
    noRefundWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.error[50],
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    noRefundWarningText: {
      flex: 1,
      fontSize: 13,
      color: colors.error[700],
      fontWeight: '500',
    },
    refundHighlight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.success[50],
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    refundHighlightText: {
      flex: 1,
      fontSize: 13,
      color: colors.success[700],
      fontWeight: '600',
    },
    policyMessageContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    policyMessageText: {
      flex: 1,
      fontSize: 12,
      color: semantic.textSecondary,
      lineHeight: 18,
    },
    reasonSection: {
      marginBottom: 8,
    },
    reasonLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    reasonInput: {
      backgroundColor: semantic.background,
      borderWidth: 1,
      borderColor: semantic.border,
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? 12 : 14,
      fontSize: 14,
      color: semantic.textPrimary,
      minHeight: isMobile ? 80 : 100,
      textAlignVertical: 'top',
      ...(Platform.OS === 'web'
        ? {
            resize: 'vertical' as any,
          }
        : {}),
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: isMobile ? 8 : 12,
      padding: isMobile ? 16 : 20,
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    keepButton: {
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 8 : 10,
      backgroundColor: colors.neutral[100],
      borderWidth: 1,
      borderColor: semantic.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keepButtonText: {
      color: semantic.textSecondary,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '600',
    },
    confirmCancelButton: {
      paddingVertical: isMobile ? 10 : 12,
      paddingHorizontal: isMobile ? 16 : 20,
      borderRadius: isMobile ? 8 : 10,
      backgroundColor: semantic.error,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }
        : {
            shadowColor: semantic.error,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 4,
          }),
    },
    confirmCancelButtonDisabled: {
      opacity: 0.7,
    },
    confirmCancelContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    confirmCancelButtonText: {
      color: semantic.surface,
      fontSize: isMobile ? 14 : 15,
      fontWeight: '700',
    },
    // Success state
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? 32 : 40,
    },
    successIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: semantic.success,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    successTitle: {
      fontSize: isMobile ? 20 : 22,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 8,
    },
    successMessage: {
      fontSize: 14,
      color: semantic.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
