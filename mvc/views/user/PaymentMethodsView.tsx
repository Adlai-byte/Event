import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SkeletonCard } from '../../components/ui';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { getShadowStyle } from '../../utils/shadowStyles';
import { AppLayout } from '../../components/layout';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface PaymentMethodsViewProps {
  user: User;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

interface PaymentMethod {
  id: number;
  type: 'gcash' | 'paymaya' | 'bank';
  account_name: string;
  account_number: string;
  is_default: boolean;
  created_at: string;
}

export const PaymentMethodsView: React.FC<PaymentMethodsViewProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile } = useBreakpoints();
  const styles = createStyles(isMobile);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const encodedEmail = encodeURIComponent(user.email || '');
      const resp = await fetch(`${getApiBaseUrl()}/api/user/payment-methods?email=${encodedEmail}`);

      if (resp.ok) {
        const data = await resp.json();
        if (data.ok) {
          setPaymentMethods(data.paymentMethods || []);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGCash = () => {
    setFormData({ account_name: '', account_number: '' });
    setShowAddForm(true);
  };

  const validateGCashNumber = (number: string): boolean => {
    // GCash numbers are typically 11 digits starting with 09
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('09');
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.account_name.trim()) {
      Alert.alert('Validation Error', 'Please enter the account name');
      return;
    }

    if (!formData.account_number.trim()) {
      Alert.alert('Validation Error', 'Please enter your GCash number');
      return;
    }

    // Validate GCash number format
    if (!validateGCashNumber(formData.account_number)) {
      Alert.alert(
        'Invalid GCash Number',
        'Please enter a valid GCash mobile number (11 digits starting with 09)',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      setSubmitting(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/user/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          type: 'gcash',
          account_name: formData.account_name.trim(),
          account_number: formData.account_number.replace(/\D/g, ''), // Remove non-digits
          is_default: paymentMethods.length === 0, // Set as default if first payment method
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.ok) {
          Alert.alert('Success', 'GCash account linked successfully!');
          setShowAddForm(false);
          setFormData({ account_name: '', account_number: '' });
          loadPaymentMethods();
        } else {
          Alert.alert('Error', data.error || 'Failed to link GCash account');
        }
      } else {
        const errorData = await resp.json();
        Alert.alert('Error', errorData.error || 'Failed to link GCash account');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/user/payment-methods/${id}/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.ok) {
          loadPaymentMethods();
        } else {
          Alert.alert('Error', data.error || 'Failed to set default payment method');
        }
      } else {
        const errorData = await resp.json();
        Alert.alert('Error', errorData.error || 'Failed to set default payment method');
      }
    } catch (error) {
      console.error('Error setting default:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete Payment Method', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const resp = await fetch(`${getApiBaseUrl()}/api/user/payment-methods/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userEmail: user.email,
              }),
            });

            if (resp.ok) {
              const data = await resp.json();
              if (data.ok) {
                Alert.alert('Success', 'Payment method removed successfully');
                loadPaymentMethods();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete payment method');
              }
            } else {
              const errorData = await resp.json();
              Alert.alert('Error', errorData.error || 'Failed to delete payment method');
            }
          } catch (error) {
            console.error('Error deleting payment method:', error);
            Alert.alert('Error', 'An error occurred. Please try again.');
          }
        },
      },
    ]);
  };

  const formatGCashNumber = (number: string): string => {
    // Format as 09XX XXX XXXX
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return number;
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <View key={method.id} style={[styles.paymentMethodCard, getShadowStyle(0.1, 4, 2)]}>
      <View style={styles.paymentMethodHeader}>
        <View style={styles.paymentMethodInfo}>
          <View style={styles.paymentMethodIcon}>
            <Feather name="smartphone" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.paymentMethodDetails}>
            <Text style={styles.paymentMethodType}>GCash</Text>
            <Text style={styles.paymentMethodName}>{method.account_name}</Text>
            <Text style={styles.paymentMethodNumber}>
              {formatGCashNumber(method.account_number)}
            </Text>
          </View>
        </View>
        {method.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      <View style={styles.paymentMethodActions}>
        {!method.is_default && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(method.id)}
            accessibilityRole="button"
            accessibilityLabel={`Set ${method.account_name} as default`}
          >
            <Text style={styles.actionButtonText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(method.id)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${method.account_name} payment method`}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <AppLayout
        role="user"
        activeRoute="settings"
        title="Payment Methods"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role="user"
      activeRoute="settings"
      title="Payment Methods"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Add GCash Button */}
        {!showAddForm && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.addButton, getShadowStyle(0.1, 4, 2)]}
              onPress={handleAddGCash}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Link GCash account"
            >
              <Feather name="smartphone" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
              <View style={styles.addButtonTextContainer}>
                <Text style={styles.addButtonText}>Link GCash Account</Text>
                <Text style={styles.addButtonSubtext}>Connect your GCash for easy payments</Text>
              </View>
              <Feather name="chevron-right" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Add GCash Form */}
        {showAddForm && (
          <View style={styles.section}>
            <View style={[styles.formCard, getShadowStyle(0.1, 4, 2)]}>
              <Text style={styles.formTitle}>Link GCash Account</Text>

              <Text style={styles.label}>Account Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account name"
                value={formData.account_name}
                onChangeText={(text) => setFormData({ ...formData, account_name: text })}
                autoCapitalize="words"
                accessibilityLabel="Account name"
              />

              <Text style={styles.label}>GCash Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="09XX XXX XXXX"
                value={formData.account_number}
                onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                keyboardType="phone-pad"
                maxLength={13}
                accessibilityLabel="GCash mobile number"
              />
              <Text style={styles.hintText}>
                Enter your 11-digit GCash mobile number (e.g., 09123456789)
              </Text>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddForm(false);
                    setFormData({ account_name: '', account_number: '' });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel linking GCash account"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  accessibilityRole="button"
                  accessibilityLabel="Link GCash account"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Link Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Payment Methods List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Accounts ({paymentMethods.length})</Text>
          {paymentMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="credit-card" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyStateText}>No payment methods linked</Text>
              <Text style={styles.emptyStateSubtext}>Link your GCash account to get started</Text>
            </View>
          ) : (
            paymentMethods.map(renderPaymentMethod)
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </AppLayout>
  );
};

const createStyles = (isMobile: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F5F5',
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      padding: isMobile ? 12 : 16,
    },
    sectionTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: isMobile ? 8 : 12,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#6C63FF',
      padding: isMobile ? 12 : 16,
      borderRadius: isMobile ? 8 : 12,
    },
    addButtonIcon: {
      fontSize: isMobile ? 20 : 24,
      marginRight: 12,
    },
    addButtonTextContainer: {
      flex: 1,
    },
    addButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    addButtonSubtext: {
      fontSize: 12,
      color: '#FFFFFF',
      opacity: 0.9,
    },
    addButtonArrow: {
      fontSize: isMobile ? 20 : 24,
      color: '#FFFFFF',
    },
    formCard: {
      backgroundColor: '#FFFFFF',
      padding: isMobile ? 14 : 20,
      borderRadius: isMobile ? 8 : 12,
    },
    formTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '600',
      color: '#000000',
      marginBottom: isMobile ? 14 : 20,
    },
    label: {
      fontSize: isMobile ? 13 : 14,
      fontWeight: '500',
      color: '#000000',
      marginBottom: 8,
      marginTop: isMobile ? 8 : 12,
    },
    input: {
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      padding: isMobile ? 10 : 12,
      fontSize: isMobile ? 14 : 16,
      backgroundColor: '#FFFFFF',
      color: '#000000',
    },
    hintText: {
      fontSize: 12,
      color: '#666666',
      marginTop: 4,
    },
    formActions: {
      flexDirection: 'row',
      marginTop: isMobile ? 14 : 20,
      gap: 12,
    },
    formButton: {
      flex: 1,
      padding: isMobile ? 12 : 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: '#F5F5F5',
    },
    cancelButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#666666',
    },
    submitButton: {
      backgroundColor: '#6C63FF',
    },
    submitButtonText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    paymentMethodCard: {
      backgroundColor: '#FFFFFF',
      padding: isMobile ? 12 : 16,
      borderRadius: isMobile ? 8 : 12,
      marginBottom: 12,
    },
    paymentMethodHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    paymentMethodInfo: {
      flexDirection: 'row',
      flex: 1,
    },
    paymentMethodIcon: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 40 : 48,
      borderRadius: isMobile ? 20 : 24,
      backgroundColor: '#6C63FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    paymentMethodIconText: {
      fontSize: isMobile ? 20 : 24,
    },
    paymentMethodDetails: {
      flex: 1,
    },
    paymentMethodType: {
      fontSize: isMobile ? 12 : 14,
      fontWeight: '600',
      color: '#6C63FF',
      marginBottom: 4,
    },
    paymentMethodName: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 4,
    },
    paymentMethodNumber: {
      fontSize: isMobile ? 12 : 14,
      color: '#666666',
    },
    defaultBadge: {
      backgroundColor: '#4CAF50',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    defaultBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    paymentMethodActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      padding: isMobile ? 8 : 10,
      borderRadius: 8,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: isMobile ? 12 : 14,
      fontWeight: '600',
      color: '#6C63FF',
    },
    deleteButton: {
      backgroundColor: '#FFEBEE',
    },
    deleteButtonText: {
      color: '#F44336',
    },
    emptyState: {
      alignItems: 'center',
      padding: isMobile ? 24 : 40,
      backgroundColor: '#FFFFFF',
      borderRadius: isMobile ? 8 : 12,
    },
    emptyStateIcon: {
      fontSize: isMobile ? 40 : 48,
      marginBottom: 12,
    },
    emptyStateText: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: isMobile ? 12 : 14,
      color: '#666666',
      textAlign: 'center',
    },
    bottomSpacing: {
      height: 20,
    },
  });
