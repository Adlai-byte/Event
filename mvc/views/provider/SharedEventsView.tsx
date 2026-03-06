import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonListItem } from '../../components/ui';
import { useSharedEvents, type SharedEventItem, type EventStatus } from '../../hooks/useEventData';
import { createStyles } from './SharedEventsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic } from '../../theme';
import { AppLayout } from '../../components/layout';

interface SharedEventsViewProps {
  userId: string;
  userEmail?: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const STATUS_COLORS: Record<EventStatus, { bg: string; text: string }> = {
  planning: { bg: colors.primary[50], text: colors.primary[500] },
  upcoming: { bg: '#FEF3C7', text: '#D97706' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8' },
  completed: { bg: colors.success[50], text: colors.success[600] },
  cancelled: { bg: colors.error[50], text: colors.error[600] },
};

export const SharedEventsView: React.FC<SharedEventsViewProps> = ({
  userEmail,
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);
  const { data: events, isLoading } = useSharedEvents(userEmail);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderEventCard = ({ item }: { item: SharedEventItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.planning;
    const roleColor =
      item.collaboratorRole === 'editor'
        ? { bg: colors.primary[50], text: colors.primary[600] }
        : { bg: colors.neutral[100], text: colors.neutral[600] };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.eventName}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>
              {item.collaboratorRole}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Feather name="calendar" size={14} color={semantic.textSecondary} />
          <Text style={styles.infoText}>
            {formatDate(item.date)}
            {item.endDate ? ` - ${formatDate(item.endDate)}` : ''}
          </Text>
        </View>

        {item.location && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={14} color={semantic.textSecondary} />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <Text style={styles.title}>Shared Events</Text>
          </View>
          <View style={styles.loadingContainer}>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        </View>
      </View>
    );
  }

  return (
    <AppLayout
      role="provider"
      activeRoute="shared-events"
      title="Shared Events"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <Text style={styles.title}>Shared Events</Text>
            <Text style={styles.subtitle}>Events shared with you by clients</Text>
          </View>

          <FlatList
            data={events || []}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderEventCard}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="users" size={48} color={colors.neutral[300]} />
                <Text style={styles.emptyText}>No shared events</Text>
                <Text style={styles.emptyHint}>
                  When clients share their events with you, they will appear here.
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </AppLayout>
  );
};
