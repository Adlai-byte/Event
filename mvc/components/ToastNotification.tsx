import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';

interface ToastNotificationProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
  onPress?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768 || Platform.OS !== 'web';

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onClose,
  onPress,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      handleClose();
    }
  }, [visible, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { bg: '#10b981', icon: '✓', iconBg: '#059669' };
      case 'error':
        return { bg: '#ef4444', icon: '✕', iconBg: '#dc2626' };
      case 'warning':
        return { bg: '#f59e0b', icon: '⚠', iconBg: '#d97706' };
      default:
        return { bg: '#3b82f6', icon: 'ℹ', iconBg: '#2563eb' };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
            backgroundColor: typeStyles.bg,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.toastContent}
          onPress={onPress || handleClose}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: typeStyles.iconBg }]}>
            <Text style={styles.icon}>{typeStyles.icon}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
    pointerEvents: 'box-none',
  },
  toast: {
    width: isMobile ? screenWidth - 32 : Math.min(400, screenWidth - 32),
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 16,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    lineHeight: 24,
  },
});

