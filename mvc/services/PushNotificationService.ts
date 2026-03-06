import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getApiBaseUrl } from './api';

// Lazy import Device to avoid issues if module is not available
let Device: any = null;
try {
  Device = require('expo-device');
} catch {
  // intentionally empty
}

// Configure notification handler - will be set up when service is first used
let notificationHandlerConfigured = false;

function configureNotificationHandler() {
  if (notificationHandlerConfigured) return;

  try {
    if (Notifications && Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async (_notification) => {
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
    if (__DEV__) console.error('⚠️ Failed to set notification handler:', error);
  }
}

export class PushNotificationService {
  /**
   * Register for push notifications and get the Expo push token (mobile) or Web Push subscription (web)
   */
  static async registerForPushNotificationsAsync(
    userId: string,
    userEmail: string,
  ): Promise<string | null> {
    try {
      // Web Push Notifications
      if (Platform.OS === 'web') {
        return await this.registerWebPushNotifications(userId, userEmail);
      }

      // Mobile Push Notifications (Expo)
      // Configure notification handler first
      configureNotificationHandler();

      // Check if Device module is available
      if (!Device || typeof Device.isDevice === 'undefined') {
        return null;
      }

      // Only works on physical devices, not simulators
      if (!Device.isDevice) {
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '2f700796-ad6c-4968-ba78-bf655e52d776', // From app.json
      });

      const pushToken = tokenData.data;

      // Register token with backend
      await this.registerTokenWithBackend(userId, userEmail, pushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return pushToken;
    } catch (error: any) {
      if (__DEV__) console.error('❌ Error registering for push notifications:', error);
      if (__DEV__) console.error('   Error type:', error?.constructor?.name);
      if (__DEV__) console.error('   Error message:', error?.message);
      if (__DEV__) console.error('   Error stack:', error?.stack);
      return null;
    }
  }

  /**
   * Register for Web Push Notifications using Web Push API
   */
  private static async registerWebPushNotifications(
    userId: string,
    userEmail: string,
  ): Promise<string | null> {
    try {
      // Check if browser supports Push API
      if (typeof window === 'undefined') {
        return null;
      }

      if (!('serviceWorker' in navigator)) {
        return null;
      }

      if (!('PushManager' in window)) {
        return null;
      }

      // Check if notifications are allowed
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        return null;
      }

      // Register service worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error: any) {
        if (__DEV__) console.error('❌ Service Worker registration failed:', error);
        if (__DEV__) console.error('   Error message:', error?.message);
        // Try to use existing service worker
        try {
          registration = await navigator.serviceWorker.ready;
        } catch (readyError) {
          if (__DEV__) console.error('❌ Could not get service worker ready:', readyError);
          // Continue with fallback token registration even without service worker
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
      } else {
        // subscription already exists
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
      if (__DEV__) console.error('❌ Error registering web push notifications:', error);
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
      if (__DEV__) console.error('❌ Error fetching VAPID key:', error);
      return null;
    }
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

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
  private static setupWebPushListener(_registration: ServiceWorkerRegistration) {
    if (typeof window === 'undefined') return;

    // Listen for push events (handled by service worker)
    // This is mainly for logging
    navigator.serviceWorker.addEventListener('message', (_event) => {
      // intentionally empty - handled by service worker
    });
  }

  /**
   * Send push token to backend
   */
  static async registerTokenWithBackend(
    userId: string,
    userEmail: string,
    pushToken: string,
    subscriptionData?: string,
  ): Promise<void> {
    try {
      const platform =
        Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
      const apiUrl = `${getApiBaseUrl()}/api/notifications/register-token`;

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

      if (response.ok) {
        const _data = await response.json();
      } else {
        const errorText = await response.text();
        if (__DEV__) console.error('❌ Failed to register push token');
        if (__DEV__) console.error('📡 Response status:', response.status);
        if (__DEV__) console.error('📡 Response status text:', response.statusText);
        if (__DEV__) console.error('📋 Error response:', errorText);

        try {
          const error = JSON.parse(errorText);
          if (__DEV__) console.error('📋 Error details:', JSON.stringify(error, null, 2));
        } catch {
          if (__DEV__) console.error('📋 Error response (not JSON):', errorText);
        }
      }
    } catch (error: any) {
      if (__DEV__) console.error('❌ Error registering push token with backend:');
      if (__DEV__) console.error('   Error type:', error?.constructor?.name);
      if (__DEV__) console.error('   Error message:', error?.message);
      if (__DEV__) console.error('   Error stack:', error?.stack);

      // Check if it's a network error
      if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
        if (__DEV__) console.error('⚠️ Network error - check if backend server is running');
        if (__DEV__) console.error('   API Base URL:', getApiBaseUrl());
      }
    }
  }

  /**
   * Setup notification listeners
   */
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void,
  ) {
    // Configure notification handler first
    configureNotificationHandler();

    // Listener for notifications received while app is in foreground
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      onNotificationReceived?.(notification);
    });

    // Listener for when user taps on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
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
