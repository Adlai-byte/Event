import React, { useState, useEffect, useRef } from 'react';
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
  AppState
} from 'react-native';
import { AuthController } from './mvc/controllers/AuthController';
import { AuthState } from './mvc/models/AuthState';
import { User } from './mvc/models/User';
import { getApiBaseUrl } from './mvc/services/api';
import { LandingPage } from './mvc/views/LandingPage';
import { LoginView } from './mvc/views/LoginView';
import { RegisterView } from './mvc/views/user/RegisterView';
import { DashboardView } from './mvc/views/user/DashboardView';
import { BookingView } from './mvc/views/user/BookingView';
import { MessagingView } from './mvc/views/user/MessagingView';
import { HiringView } from './mvc/views/user/HiringView';
import { ProfileView } from './mvc/views/user/ProfileView';
import { PersonalInfoView } from './mvc/views/user/PersonalInfoView';
import { HelpCenterView } from './mvc/views/user/HelpCenterView';
import { SettingsView } from './mvc/views/user/SettingsView';
import { PaymentMethodsView } from './mvc/views/user/PaymentMethodsView';
import { ServiceDetailsView } from './mvc/views/user/ServiceDetailsView';
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
import GoogleLoginWebView from './components/GoogleLoginWebView';

// Get device dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isLandscape = screenWidth > screenHeight;
const isMobile = screenWidth < 768 || Platform.OS !== 'web';

type ViewMode = 'landing' | 'login' | 'register';
type MainView = 'dashboard' | 'bookings' | 'messages' | 'hiring' | 'profile' | 'personalInfo' | 'helpCenter' | 'settings' | 'paymentMethods' | 'serviceDetails' | 'adminDashboard' | 'adminUser' | 'adminServices' | 'adminBookings' | 'adminAnalytics' | 'adminMessages' | 'adminSettings' | 'adminProviderApplications' | 'providerDashboard' | 'providerServices' | 'providerBookings' | 'providerProposals' | 'providerHiring' | 'providerMessages' | 'providerAnalytics' | 'providerProfile' | 'providerSettings' | 'providerPaymentSetup';

export default function App(): React.JSX.Element {
  const [authState, setAuthState] = useState<AuthState>(new AuthState());
  // Redirect mobile users directly to login page
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'login' : 'landing');
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceIdToBook, setServiceIdToBook] = useState<string | null>(null);
  const [showGoogleWebView, setShowGoogleWebView] = useState<boolean>(false);
  const [authController, setAuthController] = useState<AuthController | null>(null);

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
  }, [authState.isAuthenticated, authState.error]);

  // Route users to correct dashboard based on role when authenticated
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) {
      return;
    }

    const userRole = authState.user.role;
    const adminViews = ['adminDashboard', 'adminUser', 'adminServices', 'adminBookings', 'adminAnalytics', 'adminMessages', 'adminSettings', 'adminProviderApplications'];
    const providerViews = ['providerDashboard', 'providerServices', 'providerBookings', 'providerProposals', 'providerHiring', 'providerMessages', 'providerAnalytics', 'providerProfile', 'providerSettings', 'providerPaymentSetup'];
    
    // Immediately route to correct dashboard based on role
    // Check if current view is appropriate for the user's role
    if (userRole === 'admin') {
      // If not on an admin view, redirect to admin dashboard
      if (!adminViews.includes(mainView)) {
        console.log('Routing admin user to adminDashboard');
        setMainView('adminDashboard');
      }
    } else if (userRole === 'provider') {
      // If not on a provider view, redirect to provider dashboard
      if (!providerViews.includes(mainView)) {
        console.log('Routing provider user to providerDashboard');
        setMainView('providerDashboard');
      }
    } else {
      // Regular user - if on admin/provider view, redirect to user dashboard
      if (adminViews.includes(mainView) || providerViews.includes(mainView)) {
        console.log('Routing regular user to dashboard');
        setMainView('dashboard');
      }
    }
  }, [authState.isAuthenticated, authState.user?.role, mainView]);

  // Handle login
  const handleLogin = async (formData: any): Promise<{ success: boolean; error?: string }> => {
    if (!authController) return { success: false, error: 'Controller not initialized' };
    const result = await authController.login(formData);
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
      // Close any open WebView modal first
      setShowGoogleWebView(false);
      
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
      setShowGoogleWebView(false);
      setViewMode('login');
      setMainView('dashboard');
      return false;
    }
  };

  // Wrapper for components that expect void return
  const handleLogoutVoid = async (): Promise<void> => {
    await handleLogout();
  };

  // Handle Google WebView success
  const handleGoogleWebViewSuccess = (result: any): void => {
    setShowGoogleWebView(false);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Google authentication failed');
    }
  };

  // Handle Google WebView close
  const handleGoogleWebViewClose = (): void => {
    setShowGoogleWebView(false);
  };

  // Toggle between login and register views
  const toggleViewMode = (): void => {
    setViewMode(viewMode === 'login' ? 'register' : 'login');
    if (authController) {
      authController.clearError();
    }
  };

  // Initialize auth controller immediately
  if (!authController) {
    const controller = new AuthController(setAuthState);
    setAuthController(controller);
    return null; // Return null while initializing
  }

  // Show dashboard if user is authenticated
  if (authState.isAuthenticated && authState.user) {
    return (
      <View style={[
        styles.container,
        (mainView === 'dashboard' || mainView.startsWith('admin') || mainView.startsWith('provider')) && { paddingBottom: 0 }
      ]}>
        <StatusBar style="auto" />
        

        {/* Main Content */}
        {mainView === 'dashboard' && (
          <DashboardView
            user={authState.user}
            authState={authState}
            onLogout={handleLogout}
            onNavigateToBookings={() => setMainView('bookings')}
            onNavigateToMessages={() => {
              setSelectedConversationId(undefined); // Clear any previous conversationId
              setMainView('messages');
            }}
            onNavigateToHiring={() => setMainView('hiring')}
            onNavigateToProfile={() => setMainView('profile')}
            onNavigateToNotifications={() => setMainView('dashboard')}
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
            serviceIdToBook={serviceIdToBook}
            onBookingModalClosed={() => setServiceIdToBook(null)}
          />
        )}
        
        {mainView === 'adminDashboard' && (
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

        {mainView === 'adminUser' && (
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

        {mainView === 'adminServices' && (
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

        {mainView === 'adminBookings' && (
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

        {mainView === 'adminAnalytics' && (
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

        {mainView === 'adminMessages' && (
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

        {mainView === 'adminProviderApplications' && (
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
        {mainView === 'providerDashboard' && (
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
            }}
          />
        )}

        {mainView === 'providerServices' && (
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

        {mainView === 'providerBookings' && (
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

        {mainView === 'providerProposals' && (
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

        {mainView === 'providerHiring' && (
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

        {mainView === 'providerMessages' && (
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

        {mainView === 'providerAnalytics' && (
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

        {mainView === 'providerProfile' && (
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
            }}
            onBack={() => setMainView('providerDashboard')}
          />
        )}

        {mainView === 'providerSettings' && (
          <ProviderSettingsView
            user={authState.user!}
            onBack={() => setMainView('providerProfile')}
            onNavigate={(route: string) => {
              if (route === 'profile') setMainView('providerProfile');
              if (route === 'settings') setMainView('providerSettings');
            }}
          />
        )}

        {mainView === 'providerPaymentSetup' && (
          <PaymentSetupView
            user={authState.user!}
            onBack={() => setMainView('providerProfile')}
          />
        )}

        {mainView === 'bookings' && (
          <BookingView
            userId={authState.user?.uid || ''}
            userEmail={authState.user?.email || undefined}
            onBack={() => setMainView('dashboard')}
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
        
        {mainView === 'messages' && (
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
        
        {mainView === 'hiring' && (
          <HiringView
            userId={authState.user?.uid || ''}
            userEmail={authState.user?.email || undefined}
            userType="client" // This could be determined by user role
            onBack={() => setMainView('dashboard')}
          />
        )}

        {mainView === 'profile' && (
          <ProfileView
            user={authState.user!}
            authState={authState}
            onLogout={handleLogout}
            onNavigateToPersonalInfo={() => setMainView('personalInfo')}
            onNavigateToHelpCenter={() => setMainView('helpCenter')}
            onNavigateToSettings={() => setMainView('settings')}
            onBack={() => setMainView('dashboard')}
          />
        )}

        {mainView === 'personalInfo' && (
          <PersonalInfoView
            user={authState.user!}
            onBack={() => setMainView('profile')}
            onSave={async (updatedUser) => {
              try {
                if (!authState.user?.email) {
                  Alert.alert('Error', 'User email not found');
                  return false;
                }

                // First, get the user ID from email
                const emailQuery = encodeURIComponent(authState.user.email);
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
                  // Trigger a refresh by re-fetching user data
                  // The AuthController will automatically update the state
                  const refreshResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${emailQuery}`);
                  if (refreshResp.ok) {
                    const refreshData = await refreshResp.json();
                    if (refreshData.ok && refreshData.exists) {
                      // Update the user object in authState
                      // Priority: 1) refreshData.profilePicture (from DB), 2) updateData.profilePicture (from response), 3) updatedUser.profilePicture (if it's a path)
                      const profilePic = refreshData.profilePicture || 
                                        updateData.profilePicture || 
                                        (updatedUser.profilePicture && updatedUser.profilePicture.startsWith('/uploads/') ? updatedUser.profilePicture : undefined);
                      console.log('📸 Final profile picture path:', profilePic);
                      const updatedUserObj = new User(
                        authState.user!.uid,
                        authState.user!.email,
                        authState.user!.displayName,
                        authState.user!.emailVerified,
                        authState.user!.createdAt,
                        authState.user!.lastLoginAt,
                        refreshData.firstName || updatedUser.firstName,
                        refreshData.middleName || updatedUser.middleName,
                        refreshData.lastName || updatedUser.lastName,
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

        {mainView === 'helpCenter' && (
          <HelpCenterView
            onBack={() => setMainView('profile')}
          />
        )}

         {mainView === 'settings' && (
           <SettingsView
             onBack={() => setMainView('profile')}
           />
         )}

        {mainView === 'serviceDetails' && selectedServiceId && (
          <ServiceDetailsView
            serviceId={selectedServiceId}
            onBack={() => {
              setMainView('dashboard');
              setSelectedServiceId(null);
            }}
            onBookNow={(serviceId) => {
              // Navigate back to dashboard and trigger booking
              setMainView('dashboard');
              setSelectedServiceId(null);
              setServiceIdToBook(serviceId);
            }}
           />
         )}

        {mainView === 'paymentMethods' && (
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

  // Show landing page or login/register views
  return (
    <>
        <StatusBar style="auto" />
      {viewMode === 'landing' ? (
        <LandingPage
          onLogin={() => setViewMode('login')}
          onRegister={() => setViewMode('register')}
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
        <ScrollView style={[styles.container, Platform.OS === 'web' && { paddingBottom: 0 }]} contentContainerStyle={styles.scrollContent}>
        <View style={[
          styles.authContainer,
          isTablet && styles.authContainerTablet,
          isLandscape && styles.authContainerLandscape
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
      )}

      {/* Google Login WebView Modal */}
      <Modal
        visible={showGoogleWebView}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <GoogleLoginWebView
          onSuccess={handleGoogleWebViewSuccess}
          onClose={handleGoogleWebViewClose}
        />
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: screenHeight,
  },
  authContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  authContainerTablet: {
    maxWidth: 500,
    padding: 50,
    margin: 40,
  },
  authContainerLandscape: {
    maxWidth: 600,
    padding: 30,
    margin: 20,
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
});
