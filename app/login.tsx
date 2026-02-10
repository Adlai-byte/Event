// app/login.tsx — Login route
import { ScrollView, View, Platform, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useBreakpoints } from '../mvc/hooks/useBreakpoints';
import { LoginView } from '../mvc/views/LoginView';
import { useAuth } from '../mvc/contexts/AuthContext';

export default function Login() {
  const { authState, isAuthenticated, login, forgotPassword, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { isMobile, isMobileWeb, isTablet, isLandscape, screenHeight } = useBreakpoints();

  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <ScrollView
      style={[
        styles.container,
        Platform.OS === 'web' && { paddingBottom: 0 },
        (isMobile || isMobileWeb) && styles.containerAuthMobile,
      ]}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: (Platform.OS === 'web' && !isMobileWeb ? 'center' : 'stretch') as any,
        minHeight: screenHeight,
      }}
    >
      <View style={[
        styles.authContainer,
        { margin: isMobileWeb ? 0 : 20, padding: isMobileWeb ? 0 : 40 },
        isTablet ? { maxWidth: 500, padding: 50, margin: 40 } : {},
        isLandscape ? { maxWidth: 600, padding: 30, margin: 20 } : {},
      ]}>
        <LoginView
          authState={authState}
          onLogin={login}
          onRegister={() => router.push('/register')}
          onForgotPassword={forgotPassword}
          onGoogleLogin={loginWithGoogle}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  containerAuthMobile: {
    backgroundColor: 'transparent',
  },
  authContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    maxWidth: '100%' as any,
    alignSelf: 'center',
    width: '100%' as any,
  },
});
