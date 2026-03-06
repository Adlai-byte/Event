import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonListItem } from '../../components/ui';
import { CreateEventModal } from '../../components/event';
import {
  useEvents,
  useCreateEventMutation,
  useDeleteEventMutation,
  type EventItem,
  type EventStatus,
} from '../../hooks/useEventData';
import { createStyles } from './EventsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic } from '../../theme';
import { AppLayout } from '../../components/layout';

interface EventsViewProps {
  userId: string;
  userEmail?: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'planning', label: 'Planning' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<EventStatus, { bg: string; text: string }> = {
  planning: { bg: colors.primary[50], text: colors.primary[500] },
  upcoming: { bg: '#FEF3C7', text: '#D97706' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8' },
  completed: { bg: colors.success[50], text: colors.success[600] },
  cancelled: { bg: colors.error[50], text: colors.error[600] },
};

export const EventsView: React.FC<EventsViewProps> = ({
  userId: _userId,
  userEmail,
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);

  const { data: events, isLoading } = useEvents(userEmail);
  const createMutation = useCreateEventMutation();
  const deleteMutation = useDeleteEventMutation();

  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (activeFilter === 'all') return events;
    return events.filter((e: EventItem) => e.status === activeFilter);
  }, [events, activeFilter]);

  const handleCreateEvent = useCallback(
    async (data: Parameters<typeof createMutation.mutate>[0]) => {
      try {
        await createMutation.mutateAsync(data);
        setShowCreateModal(false);
      } catch {
        Alert.alert('Error', 'Failed to create event. Please try again.');
      }
    },
    [createMutation],
  );

  const handleDeleteEvent = useCallback(
    (event: EventItem) => {
      const doDelete = () => {
        deleteMutation.mutate(event.id);
      };
      if (Platform.OS === 'web') {
        if (window.confirm(`Delete "${event.name}"? This cannot be undone.`)) {
          doDelete();
        }
      } else {
        Alert.alert('Delete Event', `Delete "${event.name}"? This cannot be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]);
      }
    },
    [deleteMutation],
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderEventCard = ({ item }: { item: EventItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.planning;
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => onNavigate('events/' + item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Event: ${item.name}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <Feather name="calendar" size={14} color={semantic.textSecondary} />
          <Text style={styles.cardValue}>
            {formatDate(item.date)}
            {item.endDate ? ` - ${formatDate(item.endDate)}` : ''}
          </Text>
        </View>

        {item.location && (
          <View style={styles.cardRow}>
            <Feather name="map-pin" size={14} color={semantic.textSecondary} />
            <Text style={styles.cardValue} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}

        {item.guestCount !== null && item.guestCount !== undefined && item.guestCount > 0 && (
          <View style={styles.cardRow}>
            <Feather name="users" size={14} color={semantic.textSecondary} />
            <Text style={styles.cardValue}>{item.guestCount} guests</Text>
          </View>
        )}

        {item.budget > 0 && (
          <View style={styles.cardRow}>
            <Feather name="credit-card" size={14} color={semantic.textSecondary} />
            <Text style={styles.cardValue}>
              {'\u20B1'}
              {item.budget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation?.();
              handleDeleteEvent(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            <Feather name="trash-2" size={16} color={colors.error[500]} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout
      role="user"
      activeRoute="events"
      title="Event Workspace"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        {/* Status Filter Bar */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  activeFilter === filter.key && styles.filterButtonActive,
                ]}
                onPress={() => setActiveFilter(filter.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter: ${filter.label}`}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter.key && styles.filterButtonActiveText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Event List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="layers" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No Events Found</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all'
                ? 'Create your first event to start planning!'
                : `No events with status "${activeFilter.replace('_', ' ')}"`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderEventCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB Create Button */}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowCreateModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Create new event"
        >
          <Feather name="plus" size={20} color={colors.neutral[0]} />
          <Text style={styles.fabButtonText}>New Event</Text>
        </TouchableOpacity>

        {/* Create Event Modal */}
        <CreateEventModal
          visible={showCreateModal}
          isEdit={false}
          isSubmitting={createMutation.isPending}
          onSubmit={handleCreateEvent}
          onClose={() => setShowCreateModal(false)}
        />
      </View>
    </AppLayout>
  );
};
