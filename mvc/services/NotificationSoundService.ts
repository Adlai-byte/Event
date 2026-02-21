import { Platform } from 'react-native';

// Lazy import Audio to prevent crashes if module is not available
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (error) {
  console.log('⚠️ expo-av module not available');
}

class NotificationSoundService {
  private soundObject: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    if (!Audio) {
      console.log('⚠️ Audio module not available');
      return;
    }
    
    try {
      // Request audio permissions
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('⚠️ Failed to initialize notification sound:', error);
    }
  }

  async playNotificationSound(type: 'default' | 'success' | 'error' | 'info' = 'default') {
    try {
      await this.initialize();

      // Unload previous sound if exists
      if (this.soundObject) {
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }

      // For now, we'll use a simple beep pattern
      // In production, you can load actual sound files
      // For web, we'll use Web Audio API
      if (Platform.OS === 'web') {
        this.playWebSound(type);
      } else {
        // For mobile, you can load actual sound files
        // Example: const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/notification.mp3'));
        // For now, we'll use a simple vibration pattern
        this.playMobileSound(type);
      }
    } catch (error) {
      console.error('⚠️ Failed to play notification sound:', error);
    }
  }

  private playWebSound(type: string) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different types
      const frequencies: { [key: string]: number } = {
        success: 800,
        error: 400,
        info: 600,
        default: 600,
      };

      oscillator.frequency.value = frequencies[type] || 600;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('⚠️ Failed to play web sound:', error);
    }
  }

  private playMobileSound(type: string) {
    // For mobile, use Web Audio API fallback or vibration
    console.log(`🔔 Playing ${type} notification sound`);
    
    // Try to use Web Audio API as fallback
    try {
      this.playWebSound(type);
    } catch (error) {
      console.log('⚠️ Could not play mobile sound:', error);
    }
    
    // You can add vibration here using expo-haptics
    // import * as Haptics from 'expo-haptics';
    // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async cleanup() {
    try {
      if (this.soundObject) {
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }
    } catch (error) {
      console.error('⚠️ Failed to cleanup notification sound:', error);
    }
  }
}

export const notificationSoundService = new NotificationSoundService();

