import React, { useState, useEffect } from 'react';
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
import { getApiBaseUrl } from '../services/api';
import { getShadowStyle } from '../utils/shadowStyles';


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

  const handlePay = async () => {
    console.log('Pay button clicked');
    setErrorMessage(''); // Clear previous error
    
    if (paymentMethod === 'cash') {
      await processCashPayment();
    } else {
    await processPayment();
    }
  };

  const processPayment = async () => {
    try {
      setProcessing(true);
      console.log('Creating PayMongo payment for booking:', booking.id);

      const apiUrl = `${getApiBaseUrl()}/api/bookings/${booking.id}/pay`;
      console.log('Calling API:', apiUrl);

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
        }),
      });

      console.log('API Response status:', resp.status);
      const data = await resp.json();
      console.log('API Response data:', data);

      if (resp.ok && data.ok && data.paymentUrl) {
        console.log('PayMongo payment URL created:', data.paymentUrl);
        console.log('Source ID:', data.sourceId);
        console.log('Amount:', data.amount);
        
        // Close modal first
        onClose();
        
        // Call onSuccess to trigger refresh
        onSuccess();
        
        // Redirect to PayMongo checkout URL
        if (Platform.OS === 'web' || (typeof window !== 'undefined' && window.location)) {
          // For web, redirect directly
          console.log('Redirecting to PayMongo checkout (web):', data.paymentUrl);
          // Small delay to ensure modal closes
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = data.paymentUrl;
            } else {
              console.error('Window object not available');
              Alert.alert('Error', 'Cannot redirect to payment page.');
              setProcessing(false);
            }
          }, 200);
        } else {
          // For mobile, use Linking to open URL
          console.log('Opening PayMongo checkout (mobile):', data.paymentUrl);
          Linking.openURL(data.paymentUrl).catch((linkError) => {
            console.error('Error opening payment URL:', linkError);
            Alert.alert('Error', 'Failed to open payment page. Please try again.');
            setProcessing(false);
          });
        }
      } else {
        const errorMessage = data?.error || data?.message || 'Failed to create payment. Please try again.';
        console.error('Payment creation failed:', {
          status: resp.status,
          data: data,
        });
        
        // Check if it's a provider payment setup error
        if (errorMessage.includes('not yet set up') || errorMessage.includes('Provider not yet')) {
          setErrorMessage('Provider not yet set up his payment');
        } else {
          setErrorMessage(errorMessage);
        }
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Payment Error', 
        `Failed to process payment: ${errorMessage}\n\nPlease check:\n1. Server is running\n2. PayMongo credentials are configured\n3. Network connection is active`
      );
      setProcessing(false);
    }
  };

  const processCashPayment = async () => {
    try {
      setProcessing(true);
      console.log('Processing cash payment for booking:', booking.id);

      const apiUrl = `${getApiBaseUrl()}/api/bookings/${booking.id}/pay-cash`;
      console.log('Calling API:', apiUrl);

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: userEmail,
        }),
      });

      console.log('API Response status:', resp.status);
      const data = await resp.json();
      console.log('API Response data:', data);

      if (resp.ok && data.ok) {
        console.log('Cash payment recorded successfully');
        
        // Close modal
        onClose();
        
        // Show success message
        Alert.alert(
          'Payment Recorded',
          'Your cash payment has been recorded. Please bring the exact amount when you meet the provider.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Call onSuccess to trigger refresh
                onSuccess();
              },
            },
          ]
        );
      } else {
        const errorMessage = data?.error || data?.message || 'Failed to record cash payment. Please try again.';
        console.error('Cash payment failed:', {
          status: resp.status,
          data: data,
        });
        setErrorMessage(errorMessage);
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error processing cash payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Payment Error', 
        `Failed to process cash payment: ${errorMessage}\n\nPlease check:\n1. Server is running\n2. Network connection is active`
      );
      setProcessing(false);
    }
  };


  // Clear error when modal opens
  useEffect(() => {
    if (visible) {
      setErrorMessage('');
    }
  }, [visible]);

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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={() => setErrorMessage('')} style={styles.errorCloseButton}>
                <Text style={styles.errorCloseText}>×</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          
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

          {/* Payment Method Selection */}
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
              >
                <View style={styles.paymentMethodContent}>
                  <Text style={styles.paymentMethodIcon}>💳</Text>
                  <View style={styles.paymentMethodTextContainer}>
                    <Text style={[
                      styles.paymentMethodTitle,
                      paymentMethod === 'paymongo' && styles.paymentMethodTitleActive,
                    ]}>
                      Online Payment (PayMongo)
                    </Text>
                    <Text style={[
                      styles.paymentMethodDescription,
                      paymentMethod === 'paymongo' && styles.paymentMethodDescriptionActive,
                    ]}>
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
              >
                <View style={styles.paymentMethodContent}>
                  <Text style={styles.paymentMethodIcon}>💵</Text>
                  <View style={styles.paymentMethodTextContainer}>
                    <Text style={[
                      styles.paymentMethodTitle,
                      paymentMethod === 'cash' && styles.paymentMethodTitleActive,
                    ]}>
                      Cash on Hand
                    </Text>
                    <Text style={[
                      styles.paymentMethodDescription,
                      paymentMethod === 'cash' && styles.paymentMethodDescriptionActive,
                    ]}>
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

          {/* Payment Info */}
          {paymentMethod === 'paymongo' && (
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

          {paymentMethod === 'cash' && (
            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Cash Payment Information</Text>
              <View style={styles.cashInfoCard}>
                <Text style={styles.cashInfoText}>
                  💵 You will pay with cash directly to the provider when you meet them.
                </Text>
                <Text style={styles.cashInfoSubtext}>
                  Make sure to bring the exact amount: ₱{booking.totalCost.toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.payButton,
              processing && styles.payButtonDisabled,
            ]}
            onPress={handlePay}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                {paymentMethod === 'cash' 
                  ? `Confirm Cash Payment ₱${booking.totalCost.toLocaleString()}`
                  : `Pay ₱${booking.totalCost.toLocaleString()}`
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    ...getShadowStyle(0.1, 2, 1),
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#636E72',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
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
    color: '#636E72',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    ...getShadowStyle(0.1, 4, 2),
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#636E72',
  },
  summaryValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  paymentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#1976D2',
    marginBottom: 8,
    lineHeight: 22,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  actions: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    ...getShadowStyle(0.1, -2, 2),
  },
  payButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    ...getShadowStyle(0.2, 4, 2),
  },
  payButtonDisabled: {
    backgroundColor: '#95A5A6',
    ...getShadowStyle(0, 0, 0),
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  errorCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorCloseText: {
    color: '#DC2626',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  paymentMethodContainer: {
    gap: 12,
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...getShadowStyle(0.1, 2, 2),
  },
  paymentMethodCardActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#F5F3FF',
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
    color: '#374151',
    marginBottom: 4,
  },
  paymentMethodTitleActive: {
    color: '#6C63FF',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  paymentMethodDescriptionActive: {
    color: '#7C3AED',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6C63FF',
  },
  cashInfoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  cashInfoText: {
    fontSize: 16,
    color: '#166534',
    marginBottom: 8,
    lineHeight: 22,
    fontWeight: '600',
  },
  cashInfoSubtext: {
    fontSize: 14,
    color: '#15803D',
    lineHeight: 20,
  },
});

