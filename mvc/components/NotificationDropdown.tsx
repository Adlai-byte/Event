import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

interface Notification {
  idnotification: number | string;
  n_user_id: number;
  n_title: string;
  n_message: string;
  n_type: string;
  n_is_read: number;
  n_created_at: string;
  is_system_message?: boolean;
  message_id?: number;
}

interface NotificationDropdownProps {
  userEmail: string;
  isVisible: boolean;
  onClose: () => void;
  onViewAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
  /** On mobile, use when rendered inside a full-screen Modal to avoid absolute positioning */
  variant?: 'dropdown' | 'modal';
}

const { width: screenWidth } = require('react-native').Dimensions.get('window');
const isMobile = screenWidth < 768 || Platform.OS !== 'web';

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  userEmail,
  isVisible,
  onClose,
  onViewAll,
  onNotificationClick,
  variant = 'dropdown',
}) => {
  const queryClient = useQueryClient();
  const dropdownRef = useRef<View>(null);

  const { data: notifications = [], isLoading: loading } = useQuery<Notification[]>({
    queryKey: ['notifications', userEmail],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; notifications?: Notification[] }>('/api/notifications', { email: userEmail });
      return data.ok ? (data.notifications || []).slice(0, 5) : [];
    },
    enabled: isVisible && !!userEmail,
    refetchInterval: isVisible ? 30000 : false,
  });

  // Close dropdown when clicking outside (web only)
  useEffect(() => {
    if (!isVisible || Platform.OS !== 'web') return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !(dropdownRef.current as any).contains?.(target)) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate closure
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  const markAsRead = async (notificationId: number | string) => {
    try {
      await apiClient.post(`/api/notifications/${encodeURIComponent(notificationId.toString())}/read`, { email: userEmail });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) {
      const hours = diffHours;
      const mins = diffMins % 60;
      if (hours === 0) return `${mins}m ago`;
      return `${hours}h ${mins}m ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getNotificationColor = (type: string, isRead: number): string => {
    if (isRead === 1) return '#E5E7EB'; // Gray for read
    
    switch (type) {
      case 'provider_application_rejected':
        return '#EF4444'; // Red
      case 'provider_application_approved':
        return '#10B981'; // Green
      case 'booking_confirmed':
        return '#3B82F6'; // Blue
      case 'booking_cancelled':
        return '#F59E0B'; // Orange
      default:
        return '#6366F1'; // Indigo
    }
  };

  const parseNotificationMessage = (message: string): string => {
    // Extract main message (first line or first sentence)
    const lines = message.split('\n');
    const mainLine = lines[0] || message;
    
    // Remove "Your provider application has been rejected." prefix if present
    let cleanMessage = mainLine.replace(/^Your provider application has been rejected\.\s*/i, '');
    
    // Truncate if too long
    if (cleanMessage.length > 60) {
      cleanMessage = cleanMessage.substring(0, 57) + '...';
    }
    
    return cleanMessage || 'New notification';
  };

  if (!isVisible) return null;

  const isModalVariant = variant === 'modal' && isMobile;

  return (
    <View style={[styles.wrapper, isModalVariant && styles.wrapperModal]}>
      <View style={[styles.dropdownContainer, isModalVariant && styles.dropdownContainerModal]} ref={dropdownRef}>
        {/* Arrow - only show on web/desktop */}
        {!isMobile && <View style={styles.arrow} />}
        
        {/* Dropdown Content */}
        <View style={styles.dropdownContent}>
        {/* Header */}
        <View style={styles.dropdownHeader}>
          <Text style={styles.dropdownHeaderText}>🔔 Alerts</Text>
        </View>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((notification) => {
              const isUnread = notification.n_is_read === 0;
              const color = getNotificationColor(notification.n_type, notification.n_is_read);
              
              return (
                <TouchableOpacity
                  key={notification.idnotification}
                  style={styles.notificationItem}
                  onPress={() => {
                    if (isUnread) {
                      markAsRead(notification.idnotification);
                    }
                    onNotificationClick?.(notification);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.colorBar, { backgroundColor: color }]} />
                  <View style={styles.notificationContent}>
                    <Text 
                      style={[
                        styles.notificationText,
                        !isUnread && styles.readNotificationText
                      ]}
                      numberOfLines={2}
                    >
                      {parseNotificationMessage(notification.n_message)}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.n_created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* View All Button */}
        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              onViewAll();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.viewAllButtonText}>View All Alerts</Text>
          </TouchableOpacity>
        )}
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...(isMobile ? {
      position: 'absolute',
      top: 50,
      right: 0,
      width: screenWidth - 32,
      maxWidth: screenWidth - 32,
      zIndex: 10003,
      elevation: 10003,
    } : {
      position: 'absolute',
      top: Platform.OS === 'web' ? 50 : 50,
      right: 0,
      zIndex: 10003,
      elevation: 10003,
      ...(Platform.OS === 'web' && {
        position: 'fixed' as any,
        zIndex: 10003,
      }),
    }),
  },
  wrapperModal: {
    position: 'relative',
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '100%',
  },
  dropdownContainer: {
    ...(isMobile ? {
      width: screenWidth - 32,
      maxWidth: screenWidth - 32,
    } : {
      width: 380,
      maxWidth: 380,
    }),
  },
  dropdownContainerModal: {
    width: '100%',
    maxWidth: '100%',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: -1,
    ...(Platform.OS === 'web' && {
      filter: 'drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.1))',
    }),
  },
  dropdownContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    }),
    overflow: 'hidden',
    maxHeight: isMobile ? 400 : 500,
  },
  dropdownHeader: {
    paddingHorizontal: isMobile ? 20 : 16,
    paddingVertical: isMobile ? 14 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dropdownHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  notificationsList: {
    maxHeight: isMobile ? 300 : 380,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: isMobile ? 20 : 16,
    paddingVertical: isMobile ? 14 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: '#F9FAFB',
      },
    }),
  },
  colorBar: {
    width: 4,
    marginRight: 12,
    borderRadius: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: isMobile ? 14 : 13,
    color: '#111827',
    fontWeight: '500',
    lineHeight: isMobile ? 20 : 18,
    marginBottom: 4,
    paddingRight: isMobile ? 8 : 0,
  },
  readNotificationText: {
    color: '#6B7280',
    fontWeight: '400',
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  viewAllButton: {
    paddingVertical: isMobile ? 14 : 12,
    paddingHorizontal: isMobile ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: '#F3F4F6',
      },
    }),
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a55e1',
  },
});

