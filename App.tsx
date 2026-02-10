import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
  AppState,
  ActivityIndicator
} from 'react-native';
import { useBreakpoints } from './mvc/hooks/useBreakpoints';
import { AuthController } from './mvc/controllers/AuthController';
import { AuthState } from './mvc/models/AuthState';
import { User } from './mvc/models/User';
import { getApiBaseUrl } from './mvc/services/api';
import AuthService from './mvc/services/AuthService';
import { PushNotificationService } from './mvc/services/PushNotificationService';
import { notificationSoundService } from './mvc/services/NotificationSoundService';
import { ToastNotification } from './mvc/components/ToastNotification';
import { BannerNotification } from './mvc/components/BannerNotification';
import { LandingPage } from './mvc/views/LandingPage';
import { LoginView } from './mvc/views/LoginView';
import { RegisterView } from './mvc/views/user/RegisterView';
import { DashboardView } from './mvc/views/user/DashboardView';
import { BookingView } from './mvc/views/user/BookingView';
import { MessagingView } from './mvc/views/user/MessagingView';
import { HiringView } from './mvc/views/user/HiringView';
import { ProfileView } from './mvc/views/user/ProfileView';
import { PersonalInfoView } from './mvc/views/user/PersonalInfoView';
import { HelpCenterView as TipsView } from './mvc/views/user/HelpCenterView';
import { SettingsView } from './mvc/views/user/SettingsView';
import { PaymentMethodsView } from './mvc/views/user/PaymentMethodsView';
import { ServiceDetailsView } from './mvc/views/user/ServiceDetailsView';
import { NotificationView } from './mvc/views/user/NotificationView';
import { ProviderProfileView as UserProviderProfileView } from './mvc/views/user/ProviderProfileView';
import AdminDashboardView from './mvc/views/admin/DashboardView';
import { User as AdminUserView } from './mvc/views/admin/User';
import AdminServicesView from './mvc/views/admin/ServicesView';
import AdminBookingsView from './mvc/views/admin/BookingsView';
import AdminAnalyticsView from './mvc/views/admin/AnalyticsView';
import { MessagingView as AdminMessagingView } from './mvc/views/admin/MessagingView';
import { ProviderApplicationsView } from './mvc/views/admin/ProviderApplicationsView';
import { DashboardView as ProviderDashboardView } from './mvc/views/provider/DashboardView';
import { ServicesView as ProviderServicesView } from './mvc/views/provider/ServicesView';
import { BookingsView as ProviderBookingsView } from './mvc/views/provider/BookingsView';
import { ProposalsView as ProviderProposalsView } from './mvc/views/provider/ProposalsView';
import { MessagingView as ProviderMessagingView } from './mvc/views/provider/MessagingView';
import { AnalyticsView as ProviderAnalyticsView } from './mvc/views/provider/AnalyticsView';
import { HiringView as ProviderHiringView } from './mvc/views/provider/HiringView';
import { ProfileView as ProviderProfileView } from './mvc/views/provider/ProfileView';
import { SettingsView as ProviderSettingsView } from './mvc/views/provider/SettingsView';
import { PaymentSetupView } from './mvc/views/provider/PaymentSetupView';

type ViewMode = 'landing' | 'login' | 'register';
type MainView = 'dashboard' | 'bookings' | 'messages' | 'hiring' | 'profile' | 'personalInfo' | 'tips' | 'settings' | 'paymentMethods' | 'serviceDetails' | 'providerProfile' | 'notifications' | 'adminDashboard' | 'adminUser' | 'adminServices' | 'adminBookings' | 'adminAnalytics' | 'adminMessages' | 'adminSettings' | 'adminProviderApplications' | 'providerDashboard' | 'providerServices' | 'providerBookings' | 'providerProposals' | 'providerHiring' | 'providerMessages' | 'providerAnalytics' | 'providerProfile' | 'providerSettings' | 'providerPaymentSetup' | 'providerPersonalInfo' | 'providerNotifications';

// Error Boundary to prevent white screen when errors occur (e.g. after permission dialogs)
class AppErrorBoundary extends React.Component<
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 12 }}>
            May nangyaring error
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 }}>
            Pakisara ang app at buksan muli, o i-restart ang device.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#5bb92e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Subukan muli</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function App(): React.JSX.Element {
  const { screenWidth, screenHeight, isMobile, isMobileWeb, isTablet, isLandscape } = useBreakpoints();

  const [authState, setAuthState] = useState<AuthState>(new AuthState());
  // Use ref to track latest authState for polling
  const authStateRef = useRef<AuthState>(authState);
  // Redirect mobile users directly to login page - use one-shot Dimensions for initial value
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const initWidth = Dimensions.get('window').width;
    return (initWidth < 768 || Platform.OS !== 'web') ? 'login' : 'landing';
  });
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceIdToBook, setServiceIdToBook] = useState<string | null>(null);
  const [selectedProviderEmail, setSelectedProviderEmail] = useState<string | null>(null);
  const [authController, setAuthController] = useState<AuthController | null>(null);
  
  // Update ref whenever authState changes so polling can access latest state
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);
  
  // In-app notification states
  const [toastNotification, setToastNotification] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const [bannerNotification, setBannerNotification] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [lastNotificationId, setLastNotificationId] = useState<number | null>(null);

  // Suppress Datadog Browser SDK warnings from third-party services (e.g., PayMongo)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.console) {
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        // Filter out Datadog Browser SDK warnings
        const message = args.join(' ');
        if (message.includes('Datadog Browser SDK') && message.includes('Application ID is not configured')) {
          // Suppress this specific warning
          return;
        }
        // Allow all other warnings
        originalWarn.apply(console, args);
      };
      
      // Cleanup function to restore original console.warn
      return () => {
        console.warn = originalWarn;
      };
    }
  }, []);

  // Initialize auth controller
  useEffect(() => {
    const controller = new AuthController(setAuthState);
    setAuthController(controller);
  }, []);

  // Register for push notifications when user is authenticated
  // Use setTimeout to make it non-blocking and prevent white screen
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && authState.user.role) {
      // Register on both mobile and web
      // Delay push notification registration so dashboard is visible first (avoids white screen after Allow)
      const delayMs = Platform.OS !== 'web' ? 2500 : 1000;
      const registrationTimeout = setTimeout(() => {
        try {
          const userId = authState.user.uid || '';
          const userEmail = authState.user.email || '';
          
          console.log('🔔 Attempting to register push notifications...');
          console.log('   User ID:', userId);
          console.log('   User Email:', userEmail);
          console.log('   Platform:', Platform.OS);
          console.log('   Role:', authState.user.role);
          
          if (userId && userEmail) {
            PushNotificationService.registerForPushNotificationsAsync(userId, userEmail)
              .then((token) => {
                if (token) {
                  console.log('✅ Push notifications registered successfully');
                  console.log('   Token:', token.substring(0, 30) + '...');
                } else {
                  console.log('⚠️ Push notification registration returned null token');
                }
              })
              .catch((error) => {
                console.error('❌ Failed to register push notifications (non-critical):', error);
              });
          } else {
            console.log('⚠️ Missing userId or userEmail for push notification registration');
            console.log('   userId:', userId);
            console.log('   userEmail:', userEmail);
          }
        } catch (error) {
          console.error('❌ Error in push notification registration (non-critical):', error);
        }
      }, delayMs);
      
      return () => {
        clearTimeout(registrationTimeout);
      };
    } else {
      console.log('ℹ️ Skipping push notification registration (not authenticated or no role)');
      console.log('   isAuthenticated:', authState.isAuthenticated);
      console.log('   user:', authState.user ? 'exists' : 'null');
      console.log('   role:', authState.user?.role);
    }
  }, [authState.isAuthenticated, authState.user?.id, authState.user?.email, authState.user?.role]);

  // Setup notification listeners
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && authState.user.role) {
      // Only setup listeners on mobile devices (not web)
      if (Platform.OS !== 'web') {
        try {
          const subscription = PushNotificationService.setupNotificationListeners(
            (notification) => {
              // Handle notification received in foreground
              console.log('📬 Notification received in foreground:', notification);
              // You can show an alert or update UI here if needed
            },
            (response) => {
              // Handle notification tap
              try {
                const data = response.notification.request.content.data;
                console.log('👆 Notification tapped:', data);
                
                // Navigate based on notification type
                if (data?.type === 'new_booking') {
                  if (authState.user?.role === 'user') {
                    setMainView('bookings');
                  } else if (authState.user?.role === 'provider') {
                    setMainView('providerBookings');
                  }
                } else if (data?.type === 'new_message') {
                  if (authState.user?.role === 'user') {
                    setMainView('messages');
                  } else if (authState.user?.role === 'provider') {
                    setMainView('providerMessages');
                  } else if (authState.user?.role === 'admin') {
                    setMainView('adminMessages');
                  }
                } else if (data?.type === 'interview_scheduled' || data?.type === 'interview_rescheduled') {
                  if (authState.user?.role === 'user') {
                    setMainView('hiring');
                  }
                } else if (data?.type === 'new_provider_application') {
                  if (authState.user?.role === 'admin') {
                    setMainView('adminProviderApplications');
                  }
                }
              } catch (error) {
                console.error('⚠️ Error handling notification tap:', error);
              }
            }
          );

          return () => {
            try {
              subscription.remove();
            } catch (error) {
              console.error('⚠️ Error removing notification subscription:', error);
            }
          };
        } catch (error) {
          console.error('⚠️ Failed to setup notification listeners (non-critical):', error);
          // Don't throw - this is non-critical
        }
      }
    }
  }, [authState.isAuthenticated, authState.user]);

  // Clear the justLoggedIn flag once routing is complete
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const justLoggedIn = localStorage.getItem('justLoggedIn');
      if (justLoggedIn === 'true' && authState.isAuthenticated && authState.user?.role) {
        // Check if user is on correct dashboard
        const isOnCorrectDashboard = 
          (authState.user.role === 'admin' && (mainView === 'adminDashboard' || mainView.startsWith('admin'))) ||
          (authState.user.role === 'provider' && (mainView === 'providerDashboard' || mainView.startsWith('provider'))) ||
          (authState.user.role === 'user' && ['dashboard', 'bookings', 'messages', 'hiring', 'profile', 'personalInfo', 'tips', 'settings', 'paymentMethods', 'serviceDetails', 'providerProfile', 'notifications'].includes(mainView));
        
        if (isOnCorrectDashboard) {
          // Clear the flag once routing is complete
          localStorage.removeItem('justLoggedIn');
          }
        }
    }
  }, [authState.isAuthenticated, authState.user?.role, mainView]);

  // Handle authentication state changes
  useEffect(() => {
    if (authState.error) {
      Alert.alert('Error', authState.error);
    }

    // If not authenticated, redirect based on device type
    if (!authState.isAuthenticated) {
      // Mobile users go directly to login, desktop users see landing page
      if (isMobile) {
        // Only set to login if not already in a view mode
        if (viewMode !== 'login' && viewMode !== 'register') {
          setViewMode('login');
        }
      } else {
        // Desktop users see landing page
      if (viewMode !== 'landing' && viewMode !== 'login' && viewMode !== 'register') {
        setViewMode('landing');
        }
      }
      setMainView('dashboard');
      return;
    }
    
    // If authenticated, switch from login/register to main app view immediately
    if (authState.isAuthenticated) {
      // Always set viewMode to 'landing' when authenticated to allow main app views to render
      if (viewMode === 'login' || viewMode === 'register') {
        setViewMode('landing');
      }
      // On mobile, ensure mainView is set immediately for regular users (even if role not loaded yet)
      if (Platform.OS !== 'web' && authState.user) {
        if (authState.user.role === 'user' || !authState.user.role) {
          // Only set if not already on a valid user view
          const userViews = ['dashboard', 'bookings', 'messages', 'hiring', 'profile', 'personalInfo', 'tips', 'settings', 'paymentMethods', 'serviceDetails', 'providerProfile', 'notifications'];
          if (!userViews.includes(mainView)) {
            setMainView('dashboard');
          }
        }
      } else if (authState.user && (authState.user.role === 'user' || !authState.user.role)) {
        // Only set to dashboard if not already on a valid user view
        const userViews = ['dashboard', 'bookings', 'messages', 'hiring', 'profile', 'personalInfo', 'tips', 'settings', 'paymentMethods', 'serviceDetails', 'providerProfile', 'notifications'];
        if (!userViews.includes(mainView)) {
        setMainView('dashboard');
        }
      }
    }
  }, [authState.isAuthenticated, authState.error, authState.user, viewMode, mainView]);

  // Route users to correct dashboard based on role when authenticated
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    // If we're on user dashboard but waiting for role, don't render user dashboard
    // This prevents showing user dashboard to providers/admins while role is loading
    if (!authState.user.role && mainView === 'dashboard') {
      console.log('⏳ [AUTH] Waiting for user role to be fetched, preventing user dashboard render...');
      // Don't return - let it continue to check if we need to route
      // But we'll prevent rendering in the render section
    }

    // Wait for role to be available before routing
    if (!authState.user.role) {
      console.log('⏳ [AUTH] Waiting for user role to be fetched...');
      return;
    }

    const userRole = authState.user.role;
    const adminViews = ['adminDashboard', 'adminUser', 'adminServices', 'adminBookings', 'adminAnalytics', 'adminMessages', 'adminSettings', 'adminProviderApplications'];
    const providerViews = ['providerDashboard', 'providerServices', 'providerBookings', 'providerProposals', 'providerHiring', 'providerMessages', 'providerAnalytics', 'providerProfile', 'providerSettings', 'providerPaymentSetup', 'providerPersonalInfo', 'providerNotifications'];
    const userViews = ['dashboard', 'bookings', 'messages', 'hiring', 'profile', 'personalInfo', 'tips', 'settings', 'paymentMethods', 'serviceDetails', 'providerProfile', 'notifications'];
    
    // Immediately route to correct dashboard based on role
    // Force routing immediately when role is available
    let targetView: MainView | null = null;
    
    if (userRole === 'admin') {
      // Always route to admin dashboard if not already on an admin view
      if (!adminViews.includes(mainView)) {
        targetView = 'adminDashboard';
        console.log('✅ [AUTH] Admin user detected, routing to adminDashboard');
      }
    } else if (userRole === 'provider') {
      // Always route to provider dashboard if not already on a provider view
      // Also route if currently on user dashboard (which shouldn't happen but safety check)
      if (!providerViews.includes(mainView) || mainView === 'dashboard') {
        targetView = 'providerDashboard';
        console.log('✅ [AUTH] Provider user detected, routing to providerDashboard (from:', mainView, ')');
      }
    } else {
      // Regular user - route to user dashboard if on admin/provider view
      const restrictedProviderViews = providerViews.filter(view => view !== 'providerProfile');
      if (adminViews.includes(mainView) || restrictedProviderViews.includes(mainView)) {
        targetView = 'dashboard';
        console.log('✅ [AUTH] Regular user detected, routing to dashboard');
      }
      // Don't route if already on a valid user view - this prevents navigation from being interrupted
      // Removed the else if check to allow navigation to work properly
    }
    
    // Set the target view immediately if routing is needed
    if (targetView !== null && targetView !== mainView) {
      setMainView(targetView);
      // Ensure viewMode allows main app views to render (not stuck on login/register)
      if (viewMode === 'login' || viewMode === 'register') {
        setViewMode('landing');
      }
    } else if (authState.isAuthenticated && (viewMode === 'login' || viewMode === 'register')) {
      // If already on correct view but viewMode is still login/register, update it
      setViewMode('landing');
      // On mobile, ensure we have a default mainView set
      if (Platform.OS !== 'web' && !userViews.includes(mainView) && !adminViews.includes(mainView) && !providerViews.includes(mainView)) {
        if (userRole === 'admin') {
          setMainView('adminDashboard');
        } else if (userRole === 'provider') {
          setMainView('providerDashboard');
        } else {
          setMainView('dashboard');
        }
      }
    }
  }, [authState.isAuthenticated, authState.user, authState.user?.role, mainView, viewMode]);

  // Handle login
  const handleLogin = async (formData: any): Promise<{ success: boolean; error?: string }> => {
    if (!authController) return { success: false, error: 'Controller not initialized' };
    // Don't set mainView here - let the routing useEffect handle it based on role
    const result = await authController.login(formData);
    
    // Refresh page after successful login to ensure proper routing
    if (result.success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Store flag in localStorage to show loading after refresh
      localStorage.setItem('justLoggedIn', 'true');
      // 2 second delay to keep loading visible before refresh
      setTimeout(() => {
        window.location.reload();
      }, 100);
      } else {
        // For mobile: Force state reset similar to web refresh
        // Reset mainView to default to trigger routing logic
        setMainView('dashboard');
        setViewMode('landing');
        
        // Poll for role to be available, then route immediately
        // This mimics the web refresh behavior
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        const pollForRoleAndRoute = () => {
          attempts++;
          
          // Use ref to get latest authState
          const currentAuthState = authStateRef.current;
          
          // Check if authState has been updated with role
          if (currentAuthState.isAuthenticated && currentAuthState.user?.role) {
            const userRole = currentAuthState.user.role;
            console.log('🚀 [MOBILE-LOGIN] Role detected:', userRole);
            
            // Route immediately based on role
            if (userRole === 'admin') {
              console.log('🚀 [MOBILE-LOGIN] Routing admin to adminDashboard');
              setMainView('adminDashboard');
            } else if (userRole === 'provider') {
              console.log('🚀 [MOBILE-LOGIN] Routing provider to providerDashboard');
              setMainView('providerDashboard');
            } else if (userRole === 'user') {
              console.log('🚀 [MOBILE-LOGIN] Routing user to dashboard');
              setMainView('dashboard');
            }
            setViewMode('landing');
            return; // Stop polling once role is found and routed
          }
          
          // Continue polling if role not yet available
          if (attempts < maxAttempts) {
            setTimeout(pollForRoleAndRoute, 100);
          } else {
            console.warn('⚠️ [MOBILE-LOGIN] Role not available after polling, relying on useEffect');
          }
        };
        
        // Start polling after a small delay to allow state to update
        setTimeout(pollForRoleAndRoute, 200);
      }
    }
    
    // Note: Routing based on role is handled in the useEffect that watches authState.user
    return result;
  };

  // Handle register
  const handleRegister = async (formData: any): Promise<{ success: boolean; error?: string }> => {
    if (!authController) return { success: false, error: 'Controller not initialized' };
    return await authController.register(formData);
  };

  // Handle Google login
  const handleGoogleLogin = async (): Promise<boolean> => {
    if (!authController) return false;
    
    // OAuth will open in device browser automatically via expo-auth-session
    // No need to show WebView modal
    const success = await authController.loginWithGoogle();
    return success;
  };

  // Handle password reset
  const handleForgotPassword = async (email: string): Promise<boolean> => {
    if (!authController) return false;
    return await authController.resetPassword(email);
  };

  // Handle logout
  const handleLogout = async (): Promise<boolean> => {
    console.log('=== APP: HANDLE LOGOUT CALLED ===');
    if (!authController) {
      console.log('=== APP: NO AUTH CONTROLLER ===');
      return false;
    }
    
    try {
      console.log('=== APP: CALLING AUTH CONTROLLER LOGOUT ===');
      const success = await authController.logout();
      console.log('=== APP: LOGOUT RESULT ===', success);
      
      // Always redirect to login page after logout attempt
      console.log('=== APP: REDIRECTING TO LOGIN SCREEN ===');
      setViewMode('login');
      setMainView('dashboard');
      
      if (success) {
        console.log('=== APP: LOGOUT SUCCESSFUL ===');
      } else {
        console.log('=== APP: LOGOUT FAILED ===');
      }
      return success;
    } catch (error) {
      console.error('=== APP: LOGOUT ERROR ===', error);
      // Even if there's an error, redirect to login
      setViewMode('login');
      setMainView('dashboard');
      return false;
    }
  };

  // Wrapper for components that expect void return
  const handleLogoutVoid = async (): Promise<void> => {
    await handleLogout();
  };

  // Toggle between login and register views
  const toggleViewMode = (): void => {
    setViewMode(viewMode === 'login' ? 'register' : 'login');
    if (authController) {
      authController.clearError();
    }
  };

  // Dynamic styles that depend on reactive breakpoints
  const dynamicStyles = useMemo(() => ({
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center' as const,
      alignItems: (Platform.OS === 'web' && !isMobileWeb ? 'center' : 'stretch') as 'center' | 'stretch',
      minHeight: screenHeight,
    },
    authContainer: {
      backgroundColor: 'transparent' as const,
      margin: isMobileWeb ? 0 : 20,
      padding: isMobileWeb ? 0 : 40,
      borderRadius: isMobileWeb ? 0 : 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isMobileWeb ? 0 : 0.1,
      shadowRadius: 20,
      elevation: isMobileWeb ? 0 : 5,
      maxWidth: '100%' as const,
      alignSelf: 'center' as const,
      width: '100%' as const,
      ...(Platform.OS === 'web' && !isMobileWeb ? {
        display: 'flex' as const,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      } : {}),
    },
    authContainerTablet: isTablet ? {
      maxWidth: 500,
      padding: 50,
      margin: 40,
    } : {},
    authContainerLandscape: isLandscape ? {
      maxWidth: 600,
      padding: 30,
      margin: 20,
    } : {},
  }), [screenHeight, isMobileWeb, isTablet, isLandscape]);

  // Initialize auth controller immediately
  if (!authController) {
    const controller = new AuthController(setAuthState);
    setAuthController(controller);
    return null; // Return null while initializing
  }

  // Show dashboard if user is authenticated
  if (authState.isAuthenticated) {
    // Show loading if user data is not yet loaded (especially on mobile after login)
    if (!authState.user) {
      return (
        <View style={styles.container}>
          <StatusBar style="auto" />
          <View style={styles.fullPageLoadingOverlay}>
            <View style={styles.fullPageLoadingContent}>
              <ActivityIndicator size="large" color="#5bb92e" />
              <Text style={styles.fullPageLoadingText}>Loading...</Text>
            </View>
          </View>
        </View>
      );
    }

    // If authenticated but no role yet, show dashboard as fallback to prevent white screen
    // The role will be loaded in the background and routing will happen automatically
    // This prevents white screen when role is still loading
    // We show dashboard immediately when authenticated, even if viewMode hasn't updated yet
    if (!authState.user.role) {
      // Show dashboard as fallback on both mobile and web to prevent white screen
      // The role will be loaded and routing will happen automatically via useEffect
      // The useEffect at line 281 will update viewMode to 'landing' soon
        return (
          <View style={[
            styles.container,
            { paddingBottom: 0 }
          ]}>
            <StatusBar style="auto" />
            <DashboardView
              user={authState.user}
              authState={authState}
              onLogout={handleLogout}
              onNavigate={(route: string) => {
                if (route === 'dashboard') setMainView('dashboard');
                if (route === 'bookings') setMainView('bookings');
                if (route === 'messages') { setSelectedConversationId(undefined); setMainView('messages'); }
                if (route === 'hiring') setMainView('hiring');
                if (route === 'profile') setMainView('profile');
                if (route === 'notifications') setMainView('notifications');
              }}
              onNavigateToBookings={() => setMainView('bookings')}
              onNavigateToMessages={() => {
                setSelectedConversationId(undefined);
                setMainView('messages');
              }}
              onNavigateToHiring={() => setMainView('hiring')}
              onNavigateToProfile={() => setMainView('profile')}
              onNavigateToNotifications={() => setMainView('notifications')}
              onNavigateToLikes={() => setMainView('dashboard')}
              onNavigateToFeatured={() => setMainView('dashboard')}
              onNavigateToNearby={() => setMainView('dashboard')}
              onNavigateToPhotography={() => setMainView('dashboard')}
              onNavigateToVenues={() => setMainView('dashboard')}
              onNavigateToMusic={() => setMainView('dashboard')}
              onNavigateToEventDetails={(eventId: string) => {
                setSelectedServiceId(eventId);
                setMainView('serviceDetails');
              }}
              onNavigateToProviderProfile={(providerEmail: string) => {
                setSelectedProviderEmail(providerEmail);
                setMainView('providerProfile');
              }}
              serviceIdToBook={serviceIdToBook}
              onBookingModalClosed={() => setServiceIdToBook(null)}
              onNavigateToPersonalInfo={() => setMainView('personalInfo')}
            />
        </View>
      );
    }

    return (
      <View style={[
        styles.container,
        (mainView === 'dashboard' || mainView.startsWith('admin') || mainView.startsWith('provider')) && { paddingBottom: 0 }
      ]}>
        <StatusBar style="auto" />


        {/* Main Content */}
        {mainView === 'dashboard' && (
          authState.user?.role === 'user' ||
          (authState.user?.role === undefined && authState.isAuthenticated)
        ) && (
          <DashboardView
            user={authState.user}
            authState={authState}
            onLogout={handleLogout}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('dashboard');
              if (route === 'bookings') setMainView('bookings');
              if (route === 'messages') { setSelectedConversationId(undefined); setMainView('messages'); }
              if (route === 'hiring') setMainView('hiring');
              if (route === 'profile') setMainView('profile');
              if (route === 'notifications') setMainView('notifications');
            }}
            onNavigateToBookings={() => setMainView('bookings')}
            onNavigateToMessages={() => {
              setSelectedConversationId(undefined); // Clear any previous conversationId
              setMainView('messages');
            }}
            onNavigateToHiring={() => setMainView('hiring')}
            onNavigateToProfile={() => setMainView('profile')}
            onNavigateToNotifications={() => setMainView('notifications')}
            onNavigateToLikes={() => setMainView('dashboard')}
            onNavigateToFeatured={() => setMainView('dashboard')}
            onNavigateToNearby={() => setMainView('dashboard')}
            onNavigateToPhotography={() => setMainView('dashboard')}
            onNavigateToVenues={() => setMainView('dashboard')}
            onNavigateToMusic={() => setMainView('dashboard')}
            onNavigateToEventDetails={(eventId: string) => {
              setSelectedServiceId(eventId);
              setMainView('serviceDetails');
            }}
            onNavigateToProviderProfile={(providerEmail: string) => {
              setSelectedProviderEmail(providerEmail);
              setMainView('providerProfile');
            }}
            serviceIdToBook={serviceIdToBook}
            onBookingModalClosed={() => setServiceIdToBook(null)}
            onNavigateToPersonalInfo={() => setMainView('personalInfo')}
          />
        )}
        
        {mainView === 'adminDashboard' && authState.user && authState.user.role === 'admin' && (
          <AdminDashboardView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'user') setMainView('adminUser');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
              if (route === 'dashboard') setMainView('adminDashboard');
            }}
          />
        )}

        {mainView === 'adminUser' && authState.user?.role === 'admin' && (
          <AdminUserView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('adminDashboard');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
              if (route === 'user') setMainView('adminUser');
            }}
          />
        )}

        {mainView === 'adminServices' && authState.user?.role === 'admin' && (
          <AdminServicesView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('adminDashboard');
              if (route === 'user') setMainView('adminUser');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
            }}
          />
        )}

        {mainView === 'adminBookings' && authState.user?.role === 'admin' && (
          <AdminBookingsView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('adminDashboard');
              if (route === 'user') setMainView('adminUser');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
            }}
          />
        )}

        {mainView === 'adminAnalytics' && authState.user?.role === 'admin' && (
          <AdminAnalyticsView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('adminDashboard');
              if (route === 'user') setMainView('adminUser');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
            }}
          />
        )}

        {mainView === 'adminMessages' && authState.user?.role === 'admin' && (
          <AdminMessagingView
            userId={authState.user?.uid || ''}
            user={authState.user || undefined}
            onBack={() => setMainView('adminDashboard')}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('adminDashboard');
              if (route === 'user') setMainView('adminUser');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
            }}
            onLogout={handleLogoutVoid}
          />
        )}

        {mainView === 'adminProviderApplications' && authState.user?.role === 'admin' && (
          <ProviderApplicationsView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('adminDashboard');
              if (route === 'user') setMainView('adminUser');
              if (route === 'services') setMainView('adminServices');
              if (route === 'bookings') setMainView('adminBookings');
              if (route === 'analytics') setMainView('adminAnalytics');
              if (route === 'messages') setMainView('adminMessages');
              if (route === 'settings') setMainView('adminSettings');
              if (route === 'providerApplications') setMainView('adminProviderApplications');
            }}
          />
        )}

        {/* Provider Views */}
        {mainView === 'providerDashboard' && authState.user && authState.user.role === 'provider' && (
          <ProviderDashboardView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
              if (route === 'notifications') setMainView('providerNotifications');
            }}
          />
        )}

        {mainView === 'providerServices' && authState.user?.role === 'provider' && (
          <ProviderServicesView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerBookings' && authState.user?.role === 'provider' && (
          <ProviderBookingsView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerProposals' && authState.user?.role === 'provider' && (
          <ProviderProposalsView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerHiring' && authState.user?.role === 'provider' && (
          <ProviderHiringView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerMessages' && authState.user?.role === 'provider' && (
          <ProviderMessagingView
            userId={authState.user?.uid || ''}
            user={authState.user || undefined}
            onBack={() => setMainView('providerDashboard')}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
            onLogout={handleLogoutVoid}
          />
        )}

        {mainView === 'providerAnalytics' && authState.user?.role === 'provider' && (
          <ProviderAnalyticsView
            user={authState.user || undefined}
            onLogout={handleLogoutVoid}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerProfile' && authState.user?.role === 'provider' && (
          <ProviderProfileView
            user={authState.user!}
            onLogout={handleLogout}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('providerDashboard');
              if (route === 'services') setMainView('providerServices');
              if (route === 'bookings') setMainView('providerBookings');
              if (route === 'proposals') setMainView('providerProposals');
              if (route === 'hiring') setMainView('providerHiring');
              if (route === 'messages') setMainView('providerMessages');
              if (route === 'analytics') setMainView('providerAnalytics');
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
              if (route === 'paymentSetup') setMainView('providerPaymentSetup');
              if (route === 'personalInfo') setMainView('providerPersonalInfo');
            }}
            onBack={() => setMainView('providerDashboard')}
          />
        )}

        {mainView === 'providerSettings' && authState.user?.role === 'provider' && (
          <ProviderSettingsView
            user={authState.user!}
            onBack={() => setMainView('providerProfile')}
            onNavigate={(route: string) => {
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerPaymentSetup' && authState.user?.role === 'provider' && (
          <PaymentSetupView
            user={authState.user!}
            onBack={() => setMainView('providerProfile')}
          />
        )}

        {mainView === 'providerPersonalInfo' && authState.user?.role === 'provider' && (
          <PersonalInfoView
            user={authState.user!}
            onBack={() => setMainView('providerProfile')}
            onSendVerificationEmail={async () => {
              if (!authController) {
                return { success: false, error: 'Authentication controller not available' };
              }
              return await authController.sendEmailVerification();
            }}
            onCheckVerification={async () => {
              if (!authController) {
                return { success: false, verified: false, error: 'Authentication controller not available' };
              }
              return await authController.checkEmailVerification();
            }}
            onSave={async (updatedUser) => {
              try {
                if (!authState.user?.email) {
                  Alert.alert('Error', 'User email not found');
                  return false;
                }

                // Check if email is being changed
                const emailChanged = updatedUser.email && updatedUser.email.trim() !== authState.user.email.trim();
                
                // If email is being changed, update it in Firebase first
                if (emailChanged && authController) {
                  const emailUpdateResult = await authController.updateUserEmail(updatedUser.email.trim());
                  if (!emailUpdateResult.success) {
                    Alert.alert('Error', emailUpdateResult.error || 'Failed to update email in Firebase. Please try again.');
                    return false;
                  }
                }

                // First, get the user ID from email (use old email if email wasn't changed, new email if it was)
                const emailQuery = encodeURIComponent(emailChanged ? updatedUser.email.trim() : authState.user.email);
                const userResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${emailQuery}`);
                if (!userResp.ok) {
                  throw new Error('Failed to fetch user ID');
                }
                const userData = await userResp.json();
                if (!userData.ok || !userData.exists || !userData.id) {
                  throw new Error('User not found in database');
                }

                // Update user with the fetched ID
                const updateResp = await fetch(`${getApiBaseUrl()}/api/users/${userData.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    firstName: updatedUser.firstName || authState.user.firstName || '',
                    middleName: updatedUser.middleName || authState.user.middleName || '',
                    lastName: updatedUser.lastName || authState.user.lastName || '',
                    suffix: (updatedUser as any).suffix || '',
                    email: updatedUser.email || authState.user.email || '',
                    phone: updatedUser.phone || authState.user.phone || '',
                    dateOfBirth: updatedUser.dateOfBirth || authState.user.dateOfBirth || '',
                    address: updatedUser.address || authState.user.address || '',
                    city: updatedUser.city || authState.user.city || '',
                    state: updatedUser.state || authState.user.state || '',
                    zipCode: updatedUser.zipCode || authState.user.zipCode || '',
                    profilePicture: updatedUser.profilePicture || undefined,
                  }),
                });

                if (!updateResp.ok) {
                  const errorData = await updateResp.json();
                  throw new Error(errorData.error || 'Failed to update user');
                }

                // Get the update response data (may include profilePicture path)
                const updateData = await updateResp.json();
                console.log('📸 Update response:', updateData);
                
                // Refresh user data after update
                if (authController) {
                  // If email was changed, reload Firebase user to get updated email
                  if (emailChanged) {
                    await authController.checkEmailVerification();
                  }
                  
                  // Trigger a refresh by re-fetching user data
                  // The AuthController will automatically update the state
                  const refreshEmail = emailChanged ? updatedUser.email.trim() : authState.user.email;
                  const refreshResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(refreshEmail)}`);
                  if (refreshResp.ok) {
                    const refreshData = await refreshResp.json();
                    if (refreshData.ok && refreshData.exists) {
                      // Get Firebase user for updated email
                      const firebaseUser = AuthService.getCurrentUser();
                      const finalEmail = firebaseUser?.email || refreshEmail;
                      
                      // Update the user object in authState
                      // Priority: 1) refreshData.profilePicture (from DB), 2) updateData.profilePicture (from response), 3) updatedUser.profilePicture (if it's a path)
                      const profilePic = refreshData.profilePicture || 
                                        updateData.profilePicture || 
                                        (updatedUser.profilePicture && updatedUser.profilePicture.startsWith('/uploads/') ? updatedUser.profilePicture : undefined);
                      console.log('📸 Final profile picture path:', profilePic);
                      const updatedUserObj = new User(
                        authState.user!.uid,
                        finalEmail,
                        authState.user!.displayName,
                        firebaseUser?.emailVerified ?? authState.user!.emailVerified,
                        authState.user!.createdAt,
                        authState.user!.lastLoginAt,
                        refreshData.firstName || updatedUser.firstName,
                        refreshData.middleName || updatedUser.middleName,
                        refreshData.lastName || updatedUser.lastName,
                        refreshData.suffix || (updatedUser as any).suffix,
                        updatedUser.phone || refreshData.phone,
                        updatedUser.dateOfBirth || refreshData.dateOfBirth,
                        updatedUser.address || refreshData.address,
                        updatedUser.city || refreshData.city,
                        updatedUser.state || refreshData.state,
                        updatedUser.zipCode || refreshData.zipCode,
                        refreshData.role || authState.user!.role,
                        profilePic
                      );
                      setAuthState(prev => prev.setUser(updatedUserObj));
                    }
                  }
                }

                return true;
              } catch (error: any) {
                console.error('Error updating user:', error);
                Alert.alert('Error', error.message || 'Failed to update personal information');
                return false;
              }
            }}
          />
        )}

        {mainView === 'bookings' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <BookingView
            userId={authState.user?.uid || ''}
            userEmail={authState.user?.email || undefined}
            user={authState.user || undefined}
            onNavigate={(route: string) => {
              if (route === 'dashboard') setMainView('dashboard');
              if (route === 'bookings') setMainView('bookings');
              if (route === 'messages') { setSelectedConversationId(undefined); setMainView('messages'); }
              if (route === 'hiring') setMainView('hiring');
              if (route === 'profile') setMainView('profile');
              if (route === 'notifications') setMainView('notifications');
            }}
            onLogout={handleLogoutVoid}
            onNavigateToBookingDetails={(bookingId: string) => {
              // Handle navigation to booking details if needed
            }}
            onNavigateToMessages={(conversationId: string) => {
              setSelectedConversationId(conversationId);
              setMainView('messages');
            }}
            onNavigateToEditEvent={(eventId: string) => {
              console.log('Navigate to edit event:', eventId);
            }}
          />
        )}
        
        {mainView === 'messages' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <MessagingView
            userId={authState.user?.uid || ''}
            userEmail={authState.user?.email || undefined}
            conversationId={selectedConversationId}
            onBack={() => {
              setSelectedConversationId(undefined);
              setMainView('dashboard');
            }}
          />
        )}
        
        {mainView === 'notifications' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <NotificationView
            userEmail={authState.user?.email || ''}
            onBack={() => setMainView('dashboard')}
          />
        )}

        {mainView === 'providerNotifications' && authState.user?.role === 'provider' && (
          <NotificationView
            userEmail={authState.user?.email || ''}
            onBack={() => setMainView('providerDashboard')}
          />
        )}

        {mainView === 'providerProfile' && selectedProviderEmail && (authState.user?.role === 'user' || !authState.user?.role) && (
          <UserProviderProfileView
            providerEmail={selectedProviderEmail}
            onBack={() => {
              setMainView('dashboard');
              setSelectedProviderEmail(null);
            }}
            onNavigateToService={(serviceId: string) => {
              setSelectedServiceId(serviceId);
              setMainView('serviceDetails');
            }}
          />
        )}

        {mainView === 'hiring' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <HiringView
            userId={authState.user?.uid || ''}
            userEmail={authState.user?.email || undefined}
            userType="client" // This could be determined by user role
            onBack={() => setMainView('dashboard')}
          />
        )}

        {mainView === 'profile' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <ProfileView
            user={authState.user!}
            authState={authState}
            onLogout={handleLogout}
            onNavigateToPersonalInfo={() => setMainView('personalInfo')}
            onNavigateToHelpCenter={() => setMainView('tips')}
            onBack={() => setMainView('dashboard')}
          />
        )}

        {mainView === 'personalInfo' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <PersonalInfoView
            user={authState.user!}
            onBack={() => setMainView('profile')}
            onSendVerificationEmail={async () => {
              if (!authController) {
                return { success: false, error: 'Authentication controller not available' };
              }
              return await authController.sendEmailVerification();
            }}
            onCheckVerification={async () => {
              if (!authController) {
                return { success: false, verified: false, error: 'Authentication controller not available' };
              }
              return await authController.checkEmailVerification();
            }}
            onSave={async (updatedUser) => {
              try {
                if (!authState.user?.email) {
                  if (Platform.OS === 'web') {
                    return { success: false, error: 'User email not found' };
                  }
                  Alert.alert('Error', 'User email not found');
                  return false;
                }

                // Check if email is being changed
                const emailChanged = updatedUser.email && updatedUser.email.trim() !== authState.user.email.trim();
                
                // If email is being changed, update it in Firebase first
                if (emailChanged && authController) {
                  const emailUpdateResult = await authController.updateUserEmail(updatedUser.email.trim());
                  if (!emailUpdateResult.success) {
                    // Return error object for web tooltip
                    if (Platform.OS === 'web') {
                      return { success: false, error: emailUpdateResult.error || 'Failed to update email in Firebase. Please try again.' };
                    }
                    Alert.alert('Error', emailUpdateResult.error || 'Failed to update email in Firebase. Please try again.');
                    return false;
                  }
                  
                  // If verification email was sent, inform user and still update database
                  // The email will be updated in Firebase after user verifies the new email
                  if (emailUpdateResult.message && emailUpdateResult.message.includes('verification email')) {
                    // Continue with database update, but show message
                    if (Platform.OS === 'web') {
                      // Will be handled in PersonalInfoView
                    } else {
                      Alert.alert('Verification Email Sent', emailUpdateResult.message);
                    }
                  }
                }

                // First, get the user ID from email (use old email if email wasn't changed, new email if it was)
                const emailQuery = encodeURIComponent(emailChanged ? updatedUser.email.trim() : authState.user.email);
                const userResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${emailQuery}`);
                if (!userResp.ok) {
                  throw new Error('Failed to fetch user ID');
                }
                const userData = await userResp.json();
                if (!userData.ok || !userData.exists || !userData.id) {
                  throw new Error('User not found in database');
                }

                // Update user with the fetched ID
                const updateResp = await fetch(`${getApiBaseUrl()}/api/users/${userData.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    firstName: updatedUser.firstName || authState.user.firstName || '',
                    middleName: updatedUser.middleName || authState.user.middleName || '',
                    lastName: updatedUser.lastName || authState.user.lastName || '',
                    suffix: (updatedUser as any).suffix || '',
                    email: updatedUser.email || authState.user.email || '',
                    phone: updatedUser.phone || authState.user.phone || '',
                    dateOfBirth: updatedUser.dateOfBirth || authState.user.dateOfBirth || '',
                    address: updatedUser.address || authState.user.address || '',
                    city: updatedUser.city || authState.user.city || '',
                    state: updatedUser.state || authState.user.state || '',
                    zipCode: updatedUser.zipCode || authState.user.zipCode || '',
                    profilePicture: updatedUser.profilePicture || undefined,
                  }),
                });

                if (!updateResp.ok) {
                  const errorData = await updateResp.json();
                  throw new Error(errorData.error || 'Failed to update user');
                }

                // Get the update response data (may include profilePicture path)
                const updateData = await updateResp.json();
                console.log('📸 Update response:', updateData);
                
                // Refresh user data after update
                if (authController) {
                  // If email was changed, reload Firebase user to get updated email
                  if (emailChanged) {
                    await authController.checkEmailVerification();
                  }
                  
                  // Trigger a refresh by re-fetching user data
                  // The AuthController will automatically update the state
                  const refreshEmail = emailChanged ? updatedUser.email.trim() : authState.user.email;
                  const refreshResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(refreshEmail)}`);
                  if (refreshResp.ok) {
                    const refreshData = await refreshResp.json();
                    if (refreshData.ok && refreshData.exists) {
                      // Get Firebase user for updated email
                      const firebaseUser = AuthService.getCurrentUser();
                      const finalEmail = firebaseUser?.email || refreshEmail;
                      
                      // Update the user object in authState
                      // Priority: 1) refreshData.profilePicture (from DB), 2) updateData.profilePicture (from response), 3) updatedUser.profilePicture (if it's a path)
                      const profilePic = refreshData.profilePicture || 
                                        updateData.profilePicture || 
                                        (updatedUser.profilePicture && updatedUser.profilePicture.startsWith('/uploads/') ? updatedUser.profilePicture : undefined);
                      console.log('📸 Final profile picture path:', profilePic);
                      const updatedUserObj = new User(
                        authState.user!.uid,
                        finalEmail,
                        authState.user!.displayName,
                        firebaseUser?.emailVerified ?? authState.user!.emailVerified,
                        authState.user!.createdAt,
                        authState.user!.lastLoginAt,
                        refreshData.firstName || updatedUser.firstName,
                        refreshData.middleName || updatedUser.middleName,
                        refreshData.lastName || updatedUser.lastName,
                        refreshData.suffix || (updatedUser as any).suffix,
                        updatedUser.phone || refreshData.phone,
                        updatedUser.dateOfBirth || refreshData.dateOfBirth,
                        updatedUser.address || refreshData.address,
                        updatedUser.city || refreshData.city,
                        updatedUser.state || refreshData.state,
                        updatedUser.zipCode || refreshData.zipCode,
                        refreshData.role || authState.user!.role,
                        profilePic
                      );
                      setAuthState(prev => prev.setUser(updatedUserObj));
                    }
                  }
                }

                return true;
              } catch (error: any) {
                console.error('Error updating user:', error);
                const errorMsg = error.message || 'Failed to update personal information';
                if (Platform.OS === 'web') {
                  // Return error object for web tooltip
                  return { success: false, error: errorMsg };
                }
                Alert.alert('Error', errorMsg);
                return false;
              }
            }}
          />
        )}

        {mainView === 'tips' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <TipsView
            onBack={() => setMainView('profile')}
          />
        )}

         {mainView === 'settings' && (authState.user?.role === 'user' || !authState.user?.role) && (
           <SettingsView
             onBack={() => setMainView('profile')}
           />
         )}

        {mainView === 'serviceDetails' && selectedServiceId && (authState.user?.role === 'user' || !authState.user?.role) && (
          <ServiceDetailsView
            serviceId={selectedServiceId}
            onBack={() => {
              setMainView('dashboard');
              setSelectedServiceId(null);
            }}
            onNavigateToProviderProfile={(providerEmail: string) => {
              setSelectedProviderEmail(providerEmail);
              setMainView('providerProfile');
            }}
            onBookNow={(serviceId) => {
              // Navigate back to dashboard and trigger booking
              setMainView('dashboard');
              setSelectedServiceId(null);
              setServiceIdToBook(serviceId);
            }}
           />
         )}

        {mainView === 'paymentMethods' && (authState.user?.role === 'user' || !authState.user?.role) && (
          <PaymentMethodsView
            user={authState.user!}
            onBack={() => setMainView('profile')}
          />
        )}

        {/* Bottom Navigation (hidden on Home, Admin, Provider views, and Web) */}
        {mainView !== 'dashboard' && !mainView.startsWith('admin') && !mainView.startsWith('provider') && Platform.OS !== 'web' && (
          <View style={styles.bottomNavigation}>
            <TouchableOpacity 
              style={styles.bottomNavItem}
              onPress={() => setMainView('dashboard')}
            >
              <Text style={styles.bottomNavIcon}>🏠</Text>
              <Text style={styles.bottomNavLabel}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bottomNavItem, mainView === 'messages' && styles.activeBottomNavItem]}
                onPress={() => {
                  setSelectedConversationId(undefined); // Clear any previous conversationId
                  setMainView('messages');
                }}
            >
                <Text style={[styles.bottomNavIcon, mainView === 'messages' && styles.activeBottomNavIcon]}>💬</Text>
                <Text style={[styles.bottomNavLabel, mainView === 'messages' && styles.activeBottomNavLabel]}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bottomNavItem, mainView === 'bookings' && styles.activeBottomNavItem]}
              onPress={() => setMainView('bookings')}
            >
              <Text style={[styles.bottomNavIcon, mainView === 'bookings' && styles.activeBottomNavIcon]}>📅</Text>
              <Text style={[styles.bottomNavLabel, mainView === 'bookings' && styles.activeBottomNavLabel]}>Booking</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bottomNavItem, mainView === 'hiring' && styles.activeBottomNavItem]}
              onPress={() => setMainView('hiring')}
            >
              <Text style={[styles.bottomNavIcon, mainView === 'hiring' && styles.activeBottomNavIcon]}>💼</Text>
              <Text style={[styles.bottomNavLabel, mainView === 'hiring' && styles.activeBottomNavLabel]}>Job</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bottomNavItem, mainView === 'profile' && styles.activeBottomNavItem]}
              onPress={() => setMainView('profile')}
            >
              <Text style={[styles.bottomNavIcon, mainView === 'profile' && styles.activeBottomNavIcon]}>👤</Text>
              <Text style={[styles.bottomNavLabel, mainView === 'profile' && styles.activeBottomNavLabel]}>Profile</Text>
            </TouchableOpacity>
          </View>
        )}
       </View>
     );
  }

  // Show full-page loading when authenticated but routing is in progress
  // Also show during initial load after login (check localStorage)
  const justLoggedIn = Platform.OS === 'web' && typeof window !== 'undefined' ? localStorage.getItem('justLoggedIn') === 'true' : false;
  const isRouting = (authState.isLoading || justLoggedIn) || (authState.isAuthenticated && authState.user && (!authState.user.role || 
    (authState.user.role === 'admin' && mainView !== 'adminDashboard' && !mainView.startsWith('admin')) ||
    (authState.user.role === 'provider' && mainView !== 'providerDashboard' && !mainView.startsWith('provider')) ||
    (authState.user.role === 'user' && mainView !== 'dashboard' && !['dashboard', 'bookings', 'messages', 'hiring', 'profile', 'personalInfo', 'tips', 'settings', 'paymentMethods', 'serviceDetails', 'providerProfile', 'notifications'].includes(mainView))
  ));

  // Show landing page or login/register views
  return (
    <>
        <StatusBar style="auto" />
        {/* Full Page Loading Overlay when routing */}
        {isRouting && (
          <View style={styles.fullPageLoadingOverlay}>
            <View style={styles.fullPageLoadingContent}>
              <ActivityIndicator size="large" color="#5bb92e" />
              <Text style={styles.fullPageLoadingText}>Loading</Text>
            </View>
          </View>
        )}

        {/* Banner Notification */}
        <BannerNotification
          visible={bannerNotification.visible}
          title={bannerNotification.title}
          message={bannerNotification.message}
          type={bannerNotification.type}
          onClose={() => setBannerNotification({ ...bannerNotification, visible: false })}
          onPress={() => {
            setBannerNotification({ ...bannerNotification, visible: false });
            if (authState.user?.role === 'user') {
              setMainView('notifications');
            }
          }}
        />

        {/* Toast Notification */}
        <ToastNotification
          visible={toastNotification.visible}
          message={toastNotification.message}
          type={toastNotification.type}
          onClose={() => setToastNotification({ ...toastNotification, visible: false })}
          onPress={() => {
            setToastNotification({ ...toastNotification, visible: false });
            if (authState.user?.role === 'user') {
              setMainView('notifications');
            }
          }}
        />
      {/* Only show landing/login/register if NOT authenticated */}
      {!authState.isAuthenticated && (
        viewMode === 'landing' ? (
          <LandingPage
            onLogin={() => setViewMode('login')}
            onRegister={() => setViewMode('register')}
            authState={authState}
            onLoginSubmit={handleLogin}
            onRegisterSubmit={handleRegister}
            onForgotPassword={handleForgotPassword}
            onGoogleLogin={handleGoogleLogin}
            onNavigateToService={(serviceId) => {
              // If not authenticated, prompt to login
              if (!authState.isAuthenticated) {
                Alert.alert(
                  'Login Required',
                  'Please login to view service details.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => setViewMode('login') }
                  ]
                );
              } else {
                // If authenticated, navigate to service details
                setSelectedServiceId(serviceId);
                setMainView('serviceDetails');
              }
            }}
          />
        ) : (
          <ScrollView
            style={[
              styles.container,
              Platform.OS === 'web' && { paddingBottom: 0 },
              (viewMode === 'login' || viewMode === 'register') && (isMobile || isMobileWeb) && styles.containerAuthMobile,
            ]}
            contentContainerStyle={dynamicStyles.scrollContent}
          >
          <View style={[
            dynamicStyles.authContainer,
            dynamicStyles.authContainerTablet,
            dynamicStyles.authContainerLandscape
          ]}>
            {viewMode === 'login' ? (
              <LoginView
                authState={authState}
                onLogin={handleLogin}
                onRegister={toggleViewMode}
                onForgotPassword={handleForgotPassword}
                onGoogleLogin={handleGoogleLogin}
              />
            ) : (
              <RegisterView
                authState={authState}
                onRegister={handleRegister}
                onLogin={toggleViewMode}
              />
            )}
          </View>
        </ScrollView>
        )
      )}

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    position: 'relative',
    paddingBottom: 80, // Add space for bottom navigation
  },
  containerAuthMobile: {
    backgroundColor: 'transparent',
  },
  // Bottom Navigation Styles
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeBottomNavItem: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginHorizontal: 2,
  },
  bottomNavIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeBottomNavIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  bottomNavLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  activeBottomNavLabel: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '600',
  },
  fullPageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      position: 'fixed' as any,
    } : {}),
  },
  fullPageLoadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPageLoadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#0b0000',
  },
});

export default function AppRoot(): React.JSX.Element {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

