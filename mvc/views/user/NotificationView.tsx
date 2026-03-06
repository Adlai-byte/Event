import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SkeletonListItem } from '../../components/ui';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { Feather } from '@expo/vector-icons';
import { colors, semantic } from '../../theme';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useToast } from '../../contexts/ToastContext';

interface Notification {
  idnotification: number | string; // Can be number or "system_123" format
  n_user_id: number;
  n_title: string;
  n_message: string;
  n_type: string;
  n_is_read: number;
  n_created_at: string;
  is_system_message?: boolean; // Flag for system messages from conversations
  message_id?: number; // Original message ID for system messages
}

interface NotificationViewProps {
  userEmail: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export const NotificationView: React.FC<NotificationViewProps> = ({
  userEmail,
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);
  const { showToast } = useToast();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications via React Query (socket invalidation replaces polling)
  const { data: notificationsData, isLoading: loading } = useQuery({
    queryKey: ['user-notifications', userEmail],
    queryFn: async () => {
      const resp = await fetch(
        `${getApiBaseUrl()}/api/notifications?email=${encodeURIComponent(userEmail)}`,
      );
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.ok ? data.notifications || [] : [];
    },
    enabled: !!userEmail,
  });

  const notifications: Notification[] = notificationsData ?? [];

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['user-notifications-unread', userEmail],
    queryFn: async () => {
      const resp = await fetch(
        `${getApiBaseUrl()}/api/notifications/unread-count?email=${encodeURIComponent(userEmail)}`,
      );
      if (!resp.ok) return 0;
      const data = await resp.json();
      return data.ok ? data.count || 0 : 0;
    },
    enabled: !!userEmail,
  });

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-notifications', userEmail] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread', userEmail] }),
    ]).finally(() => setRefreshing(false));
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number | string) => {
      await fetch(
        `${getApiBaseUrl()}/api/notifications/${encodeURIComponent(notificationId.toString())}/read?email=${encodeURIComponent(userEmail)}`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread', userEmail] });
    },
  });

  const markAsRead = (notificationId: number | string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(
        `${getApiBaseUrl()}/api/notifications/mark-all-read?email=${encodeURIComponent(userEmail)}`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread', userEmail] });
      showToast({ message: 'All notifications marked as read', type: 'success' });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to mark all notifications as read');
    },
  });

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
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
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'provider_application_rejected':
        return {
          icon: 'x-circle' as const,
          iconBg: colors.error[50],
          iconColor: colors.error[600],
          borderColor: '#FECACA',
        };
      case 'provider_application_approved':
        return {
          icon: 'check-circle' as const,
          iconBg: colors.success[50],
          iconColor: colors.success[600],
          borderColor: '#A7F3D0',
        };
      case 'booking_confirmed':
        return {
          icon: 'calendar' as const,
          iconBg: '#DBEAFE',
          iconColor: '#2563EB',
          borderColor: '#BFDBFE',
        };
      case 'booking_cancelled':
        return {
          icon: 'slash' as const,
          iconBg: colors.error[50],
          iconColor: colors.error[600],
          borderColor: '#FECACA',
        };
      default:
        return {
          icon: 'bell' as const,
          iconBg: '#EFF6FF',
          iconColor: semantic.primary,
          borderColor: '#DBEAFE',
        };
    }
  };

  const parseNotificationMessage = (message: string) => {
    // Extract reason if it's a rejection message
    const reasonMatch = message.match(/Reason:\s*(.+?)(\n\n|$)/i);
    const reason = reasonMatch ? reasonMatch[1].trim() : null;

    // Extract main message
    const mainMessage = message.split('\n\n')[0] || message;

    return {
      mainMessage,
      reason,
      hasReapply: message.includes('reapply'),
    };
  };

  const renderNotification = (notification: Notification) => {
    const isUnread = notification.n_is_read === 0;
    const config = getNotificationConfig(notification.n_type);
    const parsed = parseNotificationMessage(notification.n_message);

    return (
      <TouchableOpacity
        key={notification.idnotification}
        style={[styles.notificationItem, isUnread && styles.unreadNotification]}
        onPress={() => {
          if (isUnread) {
            markAsRead(notification.idnotification);
          }
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${isUnread ? 'Unread notification: ' : ''}${notification.n_title}`}
      >
        <View style={styles.notificationContent}>
          {/* Icon with colored background */}
          <View style={[styles.notificationIconContainer, { backgroundColor: config.iconBg }]}>
            <Feather name={config.icon as any} size={isMobile ? 22 : 24} color={config.iconColor} />
          </View>

          {/* Content */}
          <View style={styles.notificationTextContainer}>
            <View style={styles.notificationHeader}>
              <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
                {notification.n_title}
              </Text>
              {isUnread && (
                <View style={styles.unreadBadge}>
                  <View style={styles.unreadDot} />
                </View>
              )}
            </View>

            <Text style={[styles.notificationMessage, isUnread && styles.unreadMessage]}>
              {parsed.mainMessage}
            </Text>

            {parsed.reason && (
              <View style={styles.reasonContainer}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{parsed.reason}</Text>
              </View>
            )}

            {parsed.hasReapply && (
              <Text style={styles.reapplyText}>
                You can reapply at any time by submitting a new application.
              </Text>
            )}

            <Text style={styles.notificationTime}>{formatTime(notification.n_created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <AppLayout
        role="user"
        activeRoute="notifications"
        title="Notifications"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <View style={{ padding: 16 }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      role="user"
      activeRoute="notifications"
      title="Notifications"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {/* Mark All Read bar */}
      {unreadCount > 0 && (
        <View style={styles.markAllReadBar}>
          <View style={styles.unreadCountContainer}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
            <Text style={styles.unreadLabel}>unread</Text>
          </View>
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markAllReadButton}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text style={styles.markAllReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List Container */}
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[semantic.primary]}
              tintColor={semantic.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Feather name="bell" size={56} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>
                You don't have any notifications right now.{'\n'}
                New notifications will appear here when you receive them.
              </Text>
            </View>
          ) : (
            <>
              {notifications.map(renderNotification)}
              <View style={styles.listFooter} />
            </>
          )}
        </ScrollView>
      </View>
    </AppLayout>
  );
};

const createStyles = (isMobile: boolean, screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F7FA',
    },
    markAllReadBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isMobile ? 16 : 24,
      paddingVertical: 12,
      backgroundColor: semantic.surface,
      borderBottomWidth: 1,
      borderBottomColor: semantic.border,
    },
    unreadCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    unreadLabel: {
      fontSize: 14,
      color: semantic.textSecondary,
      fontWeight: '500',
    },
    headerBadge: {
      backgroundColor: semantic.error,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: semantic.surface,
    },
    markAllReadButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: semantic.background,
      ...(Platform.OS === 'web' && {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ':hover': {
          backgroundColor: semantic.border,
        },
      }),
    },
    markAllReadText: {
      fontSize: isMobile ? 13 : 14,
      color: semantic.primary,
      fontWeight: '600',
    },
    contentWrapper: {
      flex: 1,
      ...(Platform.OS === 'web' &&
        !isMobile && {
          maxWidth: Math.min(800, screenWidth - 40),
          width: '100%',
          alignSelf: 'center',
        }),
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: isMobile ? 16 : 20,
      paddingBottom: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationItem: {
      backgroundColor: semantic.surface,
      borderRadius: 16,
      padding: isMobile ? 16 : 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: semantic.border,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-1px)',
            },
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 2,
          }),
    },
    unreadNotification: {
      backgroundColor: '#F0F9FF',
      borderLeftWidth: 4,
      borderLeftColor: semantic.primary,
      borderColor: '#BFDBFE',
    },
    notificationContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    notificationIconContainer: {
      width: isMobile ? 48 : 52,
      height: isMobile ? 48 : 52,
      borderRadius: isMobile ? 24 : 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    notificationIcon: {
      fontSize: isMobile ? 22 : 24,
      fontWeight: '600',
    },
    notificationTextContainer: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    notificationTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '600',
      color: semantic.textPrimary,
      flex: 1,
      letterSpacing: -0.3,
    },
    unreadTitle: {
      fontWeight: '700',
      color: '#030712',
    },
    unreadBadge: {
      marginLeft: 8,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: semantic.primary,
    },
    notificationMessage: {
      fontSize: isMobile ? 14 : 15,
      color: '#4B5563',
      lineHeight: isMobile ? 20 : 22,
      marginBottom: 8,
    },
    unreadMessage: {
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    reasonContainer: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: semantic.border,
    },
    reasonLabel: {
      fontSize: isMobile ? 12 : 13,
      fontWeight: '600',
      color: semantic.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    reasonText: {
      fontSize: isMobile ? 14 : 15,
      color: '#374151',
      lineHeight: isMobile ? 20 : 22,
      fontWeight: '500',
    },
    reapplyText: {
      fontSize: isMobile ? 13 : 14,
      color: semantic.textSecondary,
      fontStyle: 'italic',
      marginBottom: 8,
      lineHeight: isMobile ? 18 : 20,
    },
    notificationTime: {
      fontSize: isMobile ? 12 : 13,
      color: '#9CA3AF',
      fontWeight: '500',
      marginTop: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      paddingHorizontal: 32,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: semantic.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyIcon: {
      fontSize: 56,
    },
    emptyTitle: {
      fontSize: isMobile ? 24 : 28,
      fontWeight: '700',
      color: semantic.textPrimary,
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    emptyText: {
      fontSize: isMobile ? 15 : 16,
      color: semantic.textSecondary,
      textAlign: 'center',
      lineHeight: isMobile ? 22 : 24,
    },
    listFooter: {
      height: 20,
    },
  });
