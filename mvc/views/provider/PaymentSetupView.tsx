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
  Linking,
  Platform
} from 'react-native';
import { SkeletonCard } from '../../components/ui';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

interface PaymentSetupViewProps {
  user: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export const PaymentSetupView: React.FC<PaymentSetupViewProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const [paymentLink, setPaymentLink] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [mode, setMode] = useState<'test' | 'live'>('live');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'link'>('api');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);

  // Helper function to detect key mode
  const getKeyMode = (key: string): 'live' | 'test' | null => {
    if (key.trim().startsWith('sk_live_') || key.trim().startsWith('pk_live_')) {
      return 'live';
    }
    if (key.trim().startsWith('sk_test_') || key.trim().startsWith('pk_test_')) {
      return 'test';
    }
    return null;
  };

  // Check if secret key matches selected mode
  const secretKeyMode = getKeyMode(secretKey);
  const secretKeyMismatch = secretKey.trim() && secretKeyMode && secretKeyMode !== mode;

  // Check if public key matches selected mode
  const publicKeyMode = getKeyMode(publicKey);
  const publicKeyMismatch = publicKey.trim() && publicKeyMode && publicKeyMode !== mode;

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const encodedEmail = encodeURIComponent(user.email);
      
      // Load API credentials
      const credentialsResp = await fetch(`${getApiBaseUrl()}/api/provider/paymongo-credentials?providerEmail=${encodedEmail}`);
      if (credentialsResp.ok) {
        const credentialsData = await credentialsResp.json();
        if (credentialsData.ok) {
          setSecretKey(credentialsData.secretKey || '');
          setPublicKey(credentialsData.publicKey || '');
          setMode(credentialsData.mode || 'live');
        }
      }
      
      // Load payment link
      const linkResp = await fetch(`${getApiBaseUrl()}/api/provider/payment-link?providerEmail=${encodedEmail}`);
      if (linkResp.ok) {
        const linkData = await linkResp.json();
        if (linkData.ok && linkData.paymentLink) {
          setPaymentLink(linkData.paymentLink);
        }
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!secretKey.trim()) {
      Alert.alert('Error', 'Please enter your PayMongo Secret Key');
      return;
    }

    if (!secretKey.trim().startsWith('sk_')) {
      Alert.alert('Error', 'Invalid secret key format. PayMongo secret keys must start with "sk_".');
      return;
    }

    if (publicKey && !publicKey.trim().startsWith('pk_')) {
      Alert.alert('Error', 'Invalid public key format. PayMongo public keys must start with "pk_".');
      return;
    }

    // Validate that key prefixes match the selected mode
    const secretKeyPrefix = secretKey.trim().startsWith('sk_live_') ? 'live' : 
                           secretKey.trim().startsWith('sk_test_') ? 'test' : null;
    
    if (secretKeyPrefix && secretKeyPrefix !== mode) {
      Alert.alert(
        'Mode Mismatch',
        `Your secret key is for ${secretKeyPrefix === 'live' ? 'LIVE' : 'TEST'} mode, but you have selected ${mode.toUpperCase()} mode. Please either:\n\n1. Switch to ${secretKeyPrefix === 'live' ? 'LIVE' : 'TEST'} mode, or\n2. Use ${mode === 'live' ? 'LIVE' : 'TEST'} mode keys (starting with ${mode === 'live' ? 'sk_live_' : 'sk_test_'})`
      );
      return;
    }

    if (publicKey && publicKey.trim()) {
      const publicKeyPrefix = publicKey.trim().startsWith('pk_live_') ? 'live' : 
                             publicKey.trim().startsWith('pk_test_') ? 'test' : null;
      
      if (publicKeyPrefix && publicKeyPrefix !== mode) {
        Alert.alert(
          'Mode Mismatch',
          `Your public key is for ${publicKeyPrefix === 'live' ? 'LIVE' : 'TEST'} mode, but you have selected ${mode.toUpperCase()} mode. Please either:\n\n1. Switch to ${publicKeyPrefix === 'live' ? 'LIVE' : 'TEST'} mode, or\n2. Use ${mode === 'live' ? 'LIVE' : 'TEST'} mode keys (starting with ${mode === 'live' ? 'pk_live_' : 'pk_test_'})`
        );
        return;
      }

      // Also check if secret and public keys match in mode
      if (secretKeyPrefix && publicKeyPrefix && secretKeyPrefix !== publicKeyPrefix) {
        Alert.alert(
          'Key Mismatch',
          'Your secret key and public key are from different modes. Please use keys from the same mode (both LIVE or both TEST).'
        );
        return;
      }
    }

    try {
      setSaving(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/paymongo-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerEmail: user.email,
          secretKey: secretKey.trim(),
          publicKey: publicKey.trim() || null,
          mode: mode,
        }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        Alert.alert('Success', 'PayMongo credentials saved successfully!');
      } else {
        Alert.alert('Error', data.error || 'Failed to save credentials');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      Alert.alert('Error', 'Failed to save credentials. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLink = async () => {
    if (!paymentLink.trim()) {
      Alert.alert('Error', 'Please enter your PayMongo payment link');
      return;
    }

    // Validate PayMongo link format
    const paymongoLinkPattern = /^https?:\/\/(paymongo\.page|l\.paymongo\.com)\//;
    if (!paymongoLinkPattern.test(paymentLink.trim())) {
      Alert.alert(
        'Invalid Link',
        'Please enter a valid PayMongo payment link.\n\nExample: https://paymongo.page/l/eventbookingpayment'
      );
      return;
    }

    try {
      setSaving(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/provider/payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerEmail: user.email,
          paymentLink: paymentLink.trim()
        }),
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        Alert.alert('Success', 'Payment link saved successfully!');
      } else {
        Alert.alert('Error', data.error || 'Failed to save payment link');
      }
    } catch (error) {
      console.error('Error saving payment link:', error);
      Alert.alert('Error', 'Failed to save payment link. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestLink = () => {
    if (!paymentLink.trim()) {
      Alert.alert('Error', 'Please enter your PayMongo payment link first');
      return;
    }
    Linking.openURL(paymentLink.trim()).catch(() => {
      Alert.alert('Error', 'Could not open the payment link');
    });
  };

  if (loading) {
    return (
      <AppLayout
        role="provider"
        activeRoute="paymentSetup"
        title="Payment Setup"
        user={user}
        onNavigate={(route) => onNavigate?.(route)}
        onLogout={() => onLogout?.()}
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
      role="provider"
      activeRoute="paymentSetup"
      title="Payment Setup"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'api' && styles.tabActive]}
            onPress={() => setActiveTab('api')}
          >
            <Text style={[styles.tabText, activeTab === 'api' && styles.tabTextActive]}>
              API Credentials
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'link' && styles.tabActive]}
            onPress={() => setActiveTab('link')}
          >
            <Text style={[styles.tabText, activeTab === 'link' && styles.tabTextActive]}>
              Payment Link
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'api' ? (
          <>
            {/* API Credentials Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🔑 PayMongo API Credentials</Text>
              <Text style={styles.infoText}>
                Enter your PayMongo API credentials to receive payments directly to your account. 
                Payments will go to YOUR PayMongo account, not a central account.
              </Text>
              <Text style={styles.infoSubtext}>
                Get your keys from: https://dashboard.paymongo.com/
              </Text>
            </View>

            {/* API Credentials Inputs */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Secret Key (Required) *</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={secretKey}
                  onChangeText={setSecretKey}
                  placeholder={mode === 'live' ? 'sk_live_...' : 'sk_test_...'}
                  placeholderTextColor="#95A5A6"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showSecretKey}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowSecretKey(!showSecretKey)}
                >
                  <Feather
                    name={showSecretKey ? 'eye-off' : 'eye'}
                    size={20}
                    color="#95A5A6"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Your PayMongo secret key (starts with sk_)
              </Text>
              {secretKeyMismatch && (
                <Text style={styles.warningText}>
                  ⚠️ This key is for {secretKeyMode?.toUpperCase()} mode, but you have selected {mode.toUpperCase()} mode
                </Text>
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Public Key (Optional)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={publicKey}
                  onChangeText={setPublicKey}
                  placeholder={mode === 'live' ? 'pk_live_...' : 'pk_test_...'}
                  placeholderTextColor="#95A5A6"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPublicKey}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPublicKey(!showPublicKey)}
                >
                  <Feather
                    name={showPublicKey ? 'eye-off' : 'eye'}
                    size={20}
                    color="#95A5A6"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Your PayMongo public key (starts with pk_)
              </Text>
              {publicKeyMismatch && (
                <Text style={styles.warningText}>
                  ⚠️ This key is for {publicKeyMode?.toUpperCase()} mode, but you have selected {mode.toUpperCase()} mode
                </Text>
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Mode</Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[styles.radio, mode === 'live' && styles.radioActive]}
                  onPress={() => setMode('live')}
                >
                  <Text style={[styles.radioText, mode === 'live' && styles.radioTextActive]}>
                    Live
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radio, mode === 'test' && styles.radioActive]}
                  onPress={() => setMode('test')}
                >
                  <Text style={[styles.radioText, mode === 'test' && styles.radioTextActive]}>
                    Test
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                Use "Live" for real payments, "Test" for testing
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveCredentials}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save API Credentials</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Payment Link Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💰 PayMongo Payment Link</Text>
              <Text style={styles.infoText}>
                Set up your PayMongo payment link as a fallback option. 
                This is only used if API credentials fail.
              </Text>
              <Text style={styles.infoSubtext}>
                Example: https://paymongo.page/l/eventbookingpayment
              </Text>
            </View>

            {/* Payment Link Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>PayMongo Payment Link</Text>
              <TextInput
                style={styles.input}
                value={paymentLink}
                onChangeText={setPaymentLink}
                placeholder="https://paymongo.page/l/your-link"
                placeholderTextColor="#95A5A6"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.helperText}>
                Enter your complete PayMongo payment page URL
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.testButton]}
                onPress={handleTestLink}
                disabled={!paymentLink.trim() || saving}
              >
                <Text style={styles.testButtonText}>Test Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveLink}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Payment Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Help Section */}
        {activeTab === 'api' ? (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>📖 How to get your PayMongo API keys:</Text>
            <View style={styles.helpSteps}>
              <Text style={styles.helpStep}>1. Log in to your PayMongo account at dashboard.paymongo.com</Text>
              <Text style={styles.helpStep}>2. Go to Settings → API Keys</Text>
              <Text style={styles.helpStep}>3. Copy your Secret Key (starts with sk_)</Text>
              <Text style={styles.helpStep}>4. Optionally copy your Public Key (starts with pk_)</Text>
              <Text style={styles.helpStep}>5. Select Live or Test mode</Text>
              <Text style={styles.helpStep}>6. Paste the keys in the fields above</Text>
            </View>
          </View>
        ) : (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>📖 How to get your PayMongo payment link:</Text>
            <View style={styles.helpSteps}>
              <Text style={styles.helpStep}>1. Log in to your PayMongo account</Text>
              <Text style={styles.helpStep}>2. Go to Payment Links section</Text>
              <Text style={styles.helpStep}>3. Create a new payment link or copy an existing one</Text>
              <Text style={styles.helpStep}>4. Paste the link in the field above</Text>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636E72',
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      alignItems: 'center',
      paddingVertical: 20,
    } : {}),
  },
  content: {
    ...(Platform.OS === 'web' ? {
      width: '100%',
      maxWidth: 800,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      marginHorizontal: 'auto',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      marginTop: 20,
      marginBottom: 20,
      padding: 20,
    } : {}),
  },
  scrollContent: {
    ...(Platform.OS === 'web' ? {
      padding: 0,
    } : {
    padding: 20,
    }),
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#6C63FF',
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    color: '#2D3436',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#95A5A6',
  },
  warningText: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 20,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  testButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6C63FF',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 12,
  },
  helpSteps: {
    gap: 8,
  },
  helpStep: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#6C63FF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  radio: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  radioActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  radioTextActive: {
    color: '#FFFFFF',
  },
});

export default PaymentSetupView;

