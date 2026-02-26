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

interface BannerNotificationProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
  onPress?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const _isMobile = screenWidth < 768 || Platform.OS !== 'web';

export const BannerNotification: React.FC<BannerNotificationProps> = ({
  visible,
  title,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  onPress,
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide down and fade in
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
      return undefined;
    }
  }, [visible, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
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
        return { bg: '#10b981', border: '#059669', icon: '✓' };
      case 'error':
        return { bg: '#ef4444', border: '#dc2626', icon: '✕' };
      case 'warning':
        return { bg: '#f59e0b', border: '#d97706', icon: '⚠' };
      default:
        return { bg: '#3b82f6', border: '#2563eb', icon: 'ℹ' };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.banner,
          {
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
            backgroundColor: typeStyles.bg,
            borderBottomColor: typeStyles.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.bannerContent}
          onPress={onPress || handleClose}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{typeStyles.icon}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10001,
    elevation: 10001,
    pointerEvents: 'box-none',
  },
  banner: {
    width: '100%',
    borderBottomWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 16 : 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : Platform.OS === 'ios' ? 50 : 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    lineHeight: 20,
  },
});
