import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import GoogleWebAuth from '../mvc/services/GoogleWebAuth';

// Types
interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
}

interface GoogleLoginWebViewProps {
  onSuccess: (result: AuthResult) => void;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GoogleLoginWebView: React.FC<GoogleLoginWebViewProps> = ({ onSuccess, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [webViewSupported, setWebViewSupported] = useState<boolean>(true);

  // Check platform compatibility
  useEffect(() => {
    if (Platform.OS === 'web') {
      setWebViewSupported(false);
      Alert.alert(
        'WebView Not Supported',
        'Google sign-in via WebView is not supported on this platform. Please use email/password login instead.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [onClose]);

  // Generate Google OAuth URL
  const googleAuthUrl: string = GoogleWebAuth.getGoogleAuthUrl();

  const handleNavigationStateChange = (navState: any): void => {
    setCurrentUrl(navState.url);
    
    // Check if this is a callback URL with authorization code
    if (navState.url.includes('code=') || navState.url.includes('error=')) {
      handleAuthCallback(navState.url);
    }
  };

  const handleAuthCallback = async (url: string): Promise<void> => {
    try {
      setLoading(true);
      const result: AuthResult = await GoogleWebAuth.handleAuthCallback(url);
      
      if (result.success) {
        onSuccess({ success: true, message: result.message });
      } else {
        onSuccess({ success: false, error: result.error });
      }
    } catch (error: any) {
      onSuccess({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    onClose();
  };

  // Show fallback UI for unsupported platforms
  if (!webViewSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign in with Google</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>WebView Not Supported</Text>
          <Text style={styles.fallbackText}>
            Google sign-in via WebView is not supported on this platform.
          </Text>
          <Text style={styles.fallbackSubtext}>
            Please use email/password login instead.
          </Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={handleClose}>
            <Text style={styles.fallbackButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign in with Google</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4a55e1" />
        </View>
      )}

      {/* WebView */}
      <WebView
        source={{ uri: googleAuthUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          Alert.alert('Error', 'Failed to load Google sign-in page. Please try again.');
          onClose();
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 30,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  fallbackSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  fallbackButton: {
    backgroundColor: '#4a55e1',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoogleLoginWebView;



