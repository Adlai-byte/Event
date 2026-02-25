// app/_layout.tsx — Root layout wrapping entire app with AuthProvider
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../mvc/services/queryClient';
import { setupReactNativeFocusManager } from '../mvc/services/queryFocusManager';
import { AuthProvider, useAuth } from '../mvc/contexts/AuthContext';
import { useSocket } from '../mvc/hooks/useSocket';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>May nangyaring error</Text>
          <Text style={styles.errorMessage}>
            Pakisara ang app at buksan muli, o i-restart ang device.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Subukan muli</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Connects the socket when a user is authenticated. Must be inside AuthProvider + QueryClientProvider. */
function SocketManager() {
  const { authState } = useAuth();
  useSocket(authState?.user?.email);
  return null;
}

export default function RootLayout() {
  useEffect(() => {
    const cleanup = setupReactNativeFocusManager();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketManager />
          <StatusBar style="auto" />
          <Slot />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#5bb92e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
