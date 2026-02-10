// app/landing.tsx — Desktop landing page
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../mvc/contexts/AuthContext';
import { LandingPage } from '../mvc/views/LandingPage';

export default function Landing() {
  const { authState, isAuthenticated, login, register, forgotPassword, loginWithGoogle } = useAuth();
  const router = useRouter();

  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <LandingPage
      onLogin={() => router.push('/login')}
      onRegister={() => router.push('/register')}
      authState={authState}
      onLoginSubmit={login}
      onRegisterSubmit={register}
      onForgotPassword={forgotPassword}
      onGoogleLogin={loginWithGoogle}
      onNavigateToService={() => router.push('/login')}
    />
  );
}
