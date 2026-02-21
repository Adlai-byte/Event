import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './api';

// Lazy import Device to avoid issues if module is not available
let Device: any = null;
try {
  Device = require('expo-device');
} catch (error) {
  console.log('⚠️ expo-device module not available');
}

// Configure notification handler - will be set up when service is first used
let notificationHandlerConfigured = false;

function configureNotificationHandler() {
  if (notificationHandlerConfigured) return;
  
  try {
    if (Notifications && Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('🔔 Notification handler called:', notification.request.content.title);
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });
      notificationHandlerConfigured = true;
    }
  } catch (error) {
    console.error('⚠️ Failed to set notification handler:', error);
  }
}

export class PushNotificationService {
  /**
   * Register for push notifications and get the Expo push token (mobile) or Web Push subscription (web)
   */
  static async registerForPushNotificationsAsync(userId: string, userEmail: string): Promise<string | null> {
    try {
      console.log('🔔 Starting push notification registration...');
      console.log('   User ID:', userId);
      console.log('   User Email:', userEmail);
      console.log('   Platform:', Platform.OS);
      
      // Web Push Notifications
      if (Platform.OS === 'web') {
        return await this.registerWebPushNotifications(userId, userEmail);
      }
      
      // Mobile Push Notifications (Expo)
      // Configure notification handler first
      configureNotificationHandler();
      console.log('✅ Notification handler configured');
      
      // Check if Device module is available
      if (!Device || typeof Device.isDevice === 'undefined') {
        console.log('⚠️ Device module not available, skipping push notification registration');
        return null;
      }
      console.log('✅ Device module available');

      // Only works on physical devices, not simulators
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        console.log('   Device.isDevice:', Device.isDevice);
        return null;
      }
      console.log('✅ Running on physical device');
      
      // Request permissions
      console.log('📋 Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('   Existing permission status:', existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📋 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('   Permission request result:', status);
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push notification permissions');
        console.log('   Final status:', finalStatus);
        return null;
      }
      console.log('✅ Notification permissions granted');

      // Get the Expo push token
      console.log('🔑 Getting Expo push token...');
      console.log('   Project ID: 2f700796-ad6c-4968-ba78-bf655e52d776');
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '2f700796-ad6c-4968-ba78-bf655e52d776', // From app.json
      });

      const pushToken = tokenData.data;
      console.log('✅ Expo push token obtained');
      console.log('   Token:', pushToken);
      console.log('   Token length:', pushToken.length);
      console.log('   Token format:', pushToken.startsWith('ExponentPushToken') ? 'Expo' : 'Other');
      console.log('📱 Platform:', Platform.OS);

      // Register token with backend
      console.log('📡 Registering token with backend...');
      await this.registerTokenWithBackend(userId, userEmail, pushToken);
      console.log('✅ Token registration complete');

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        console.log('📱 Configuring Android notification channel...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('✅ Android notification channel configured');
      }

      console.log('✅ Push notification registration completed successfully');
      return pushToken;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      console.error('   Error type:', error?.constructor?.name);
      console.error('   Error message:', error?.message);
      console.error('   Error stack:', error?.stack);
      return null;
    }
  }

  /**
   * Register for Web Push Notifications using Web Push API
   */
  private static async registerWebPushNotifications(userId: string, userEmail: string): Promise<string | null> {
    try {
      console.log('🌐 Registering for web push notifications...');
      console.log('   User ID:', userId);
      console.log('   User Email:', userEmail);
      
      // Check if browser supports Push API
      if (typeof window === 'undefined') {
        console.log('⚠️ Window object not available');
        return null;
      }
      
      if (!('serviceWorker' in navigator)) {
        console.log('⚠️ Service Worker not supported in this browser');
        return null;
      }
      
      if (!('PushManager' in window)) {
        console.log('⚠️ PushManager not supported in this browser');
        return null;
      }
      
      console.log('✅ Browser supports Push Notifications');

      // Check if notifications are allowed
      let permission = Notification.permission;
      if (permission === 'default') {
        console.log('📋 Requesting notification permission...');
        permission = await Notification.requestPermission();
      }
      
      if (permission !== 'granted') {
        console.log('⚠️ Notification permission not granted:', permission);
        return null;
      }
      console.log('✅ Notification permission granted');

      // Register service worker
      let registration: ServiceWorkerRegistration;
      try {
        console.log('📋 Registering service worker at /sw.js...');
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('✅ Service Worker registered successfully');
        console.log('   Scope:', registration.scope);
      } catch (error: any) {
        console.error('❌ Service Worker registration failed:', error);
        console.error('   Error message:', error?.message);
        // Try to use existing service worker
        try {
          registration = await navigator.serviceWorker.ready;
          console.log('✅ Using existing Service Worker');
        } catch (readyError) {
          console.error('❌ Could not get service worker ready:', readyError);
          // Continue with fallback token registration even without service worker
          console.log('📝 Registering fallback token without service worker...');
          const fallbackToken = `web_browser_${userId}_${Date.now()}`;
          await this.registerTokenWithBackend(userId, userEmail, fallbackToken);
          return fallbackToken;
        }
      }

      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Get VAPID public key from server
        const vapidPublicKey = await this.getVapidPublicKey();
        if (!vapidPublicKey) {
          console.log('⚠️ VAPID public key not available - using browser notifications fallback');
          // Fallback: use browser notifications without push subscription
          // Still register this token so we can track web users
          const fallbackToken = `web_browser_${userId}_${Date.now()}`;
          await this.registerTokenWithBackend(userId, userEmail, fallbackToken);
          return fallbackToken;
        }

        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        console.log('✅ Web Push subscription created');
      } else {
        console.log('✅ Using existing Web Push subscription');
      }

      // Convert subscription to string format for backend
      const subscriptionJson = JSON.stringify(subscription);
      const pushToken = `web_${btoa(subscriptionJson).substring(0, 200)}`;

      // Register token with backend
      await this.registerTokenWithBackend(userId, userEmail, pushToken, subscriptionJson);

      // Setup web push notification listener
      this.setupWebPushListener(registration);

      return pushToken;
    } catch (error) {
      console.error('❌ Error registering web push notifications:', error);
      return null;
    }
  }

  /**
   * Get VAPID public key from server
   */
  private static async getVapidPublicKey(): Promise<string | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/notifications/vapid-public-key`);
      if (response.ok) {
        const data = await response.json();
        return data.publicKey || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching VAPID key:', error);
      return null;
    }
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Setup web push notification listener
   */
  private static setupWebPushListener(registration: ServiceWorkerRegistration) {
    if (typeof window === 'undefined') return;

    // Listen for push events (handled by service worker)
    // This is mainly for logging
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📬 Message from service worker:', event.data);
    });
  }

  /**
   * Send push token to backend
   */
  static async registerTokenWithBackend(userId: string, userEmail: string, pushToken: string, subscriptionData?: string): Promise<void> {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const apiUrl = `${getApiBaseUrl()}/api/notifications/register-token`;
      
      console.log('📡 Sending token to backend...');
      console.log('   API URL:', apiUrl);
      console.log('   User ID:', userId);
      console.log('   User Email:', userEmail);
      console.log('   Platform:', platform);
      console.log('   Token length:', pushToken.length);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userEmail,
          pushToken,
          platform,
          ...(subscriptionData && Platform.OS === 'web' ? { subscriptionData } : {}),
        }),
      });

      console.log('📡 Backend response status:', response.status);
      console.log('📡 Backend response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Push token registered with backend');
        console.log('   Response:', JSON.stringify(data, null, 2));
        console.log('📱 Platform:', platform);
        console.log('📧 User Email:', userEmail);
        console.log('🆔 User ID:', userId);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to register push token');
        console.error('📡 Response status:', response.status);
        console.error('📡 Response status text:', response.statusText);
        console.error('📋 Error response:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          console.error('📋 Error details:', JSON.stringify(error, null, 2));
        } catch (e) {
          console.error('📋 Error response (not JSON):', errorText);
        }
      }
    } catch (error) {
      console.error('❌ Error registering push token with backend:');
      console.error('   Error type:', error?.constructor?.name);
      console.error('   Error message:', error?.message);
      console.error('   Error stack:', error?.stack);
      
      // Check if it's a network error
      if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
        console.error('⚠️ Network error - check if backend server is running');
        console.error('   API Base URL:', getApiBaseUrl());
      }
    }
  }

  /**
   * Setup notification listeners
   */
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ) {
    // Configure notification handler first
    configureNotificationHandler();
    
    // Listener for notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Listener for when user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      onNotificationTapped?.(response);
    });

    return {
      remove: () => {
        receivedListener.remove();
        responseListener.remove();
      },
    };
  }
}

