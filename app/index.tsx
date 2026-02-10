// app/index.tsx — Smart redirect based on auth state, role, and platform
import { Redirect } from 'expo-router';
import { Platform, Dimensions, ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../mvc/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading while auth initializes or role not yet fetched
  if (isLoading || (isAuthenticated && (!user || !user.role))) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5bb92e" />
        <Text style={styles.loadingText}>Loading</Text>
      </View>
    );
  }

  // Not authenticated: desktop → landing, mobile → login
  if (!isAuthenticated) {
    const isMobile = Platform.OS !== 'web' || Dimensions.get('window').width < 768;
    return <Redirect href={isMobile ? '/login' : '/landing'} />;
  }

  // Authenticated: redirect by role
  if (user?.role === 'admin') return <Redirect href="/admin/dashboard" />;
  if (user?.role === 'provider') return <Redirect href="/provider/dashboard" />;
  return <Redirect href="/user/dashboard" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#0b0000',
  },
});
