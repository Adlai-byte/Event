import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SkeletonListItem } from '../../components/ui';
import { CreateEventModal } from '../../components/event';
import {
  useEvent,
  useUpdateEventMutation,
  useEventBookings,
  useLinkBookingMutation,
  useUnlinkBookingMutation,
  useEventBudget,
  useEventChecklist,
  useAddChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
  useEventTimeline,
  useAddTimelineEntryMutation,
  useUpdateTimelineEntryMutation,
  useDeleteTimelineEntryMutation,
  type EventStatus,
  type EventBooking,
  type ChecklistItem,
  type TimelineEntry,
} from '../../hooks/useEventData';
import { apiClient } from '../../services/apiClient';
import { useQuery } from '@tanstack/react-query';
import { createStyles } from './EventDetailView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic } from '../../theme';

type TabKey = 'overview' | 'vendors' | 'timeline' | 'checklist' | 'budget';

interface UnlinkedBooking {
  idbooking?: number;
  id?: number;
  b_event_id?: number | null;
  eventId?: number | null;
  b_event_name?: string;
  eventName?: string;
  b_event_date?: string;
  eventDate?: string;
}

interface EventDetailViewProps {
  eventId: number;
  userId: string;
  userEmail?: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onBack: () => void;
}

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: 'info' },
  { key: 'vendors', label: 'Vendors', icon: 'users' },
  { key: 'timeline', label: 'Timeline', icon: 'clock' },
  { key: 'checklist', label: 'Checklist', icon: 'check-square' },
  { key: 'budget', label: 'Budget', icon: 'dollar-sign' },
];

const STATUS_COLORS: Record<EventStatus, { bg: string; text: string }> = {
  planning: { bg: colors.primary[50], text: colors.primary[500] },
  upcoming: { bg: '#FEF3C7', text: '#D97706' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8' },
  completed: { bg: colors.success[50], text: colors.success[600] },
  cancelled: { bg: colors.error[50], text: colors.error[600] },
};

export const EventDetailView: React.FC<EventDetailViewProps> = ({ eventId, userEmail, onBack }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Timeline form state
  const [tlStartTime, setTlStartTime] = useState('');
  const [tlEndTime, setTlEndTime] = useState('');
  const [tlTitle, setTlTitle] = useState('');
  const [tlDescription, setTlDescription] = useState('');

  // Queries
  const { data: event, isLoading: eventLoading } = useEvent(eventId, userEmail);
  const { data: bookings } = useEventBookings(
    activeTab === 'vendors' || activeTab === 'budget' ? eventId : null,
  );
  const { data: budget } = useEventBudget(activeTab === 'budget' ? eventId : null);
  const { data: checklist } = useEventChecklist(activeTab === 'checklist' ? eventId : null);
  const { data: timeline } = useEventTimeline(activeTab === 'timeline' ? eventId : null);

  // Unlinked bookings for link modal
  const { data: allBookings } = useQuery({
    queryKey: ['user-bookings-unlinked', userEmail],
    queryFn: async () => {
      const data = await apiClient.get<{
        ok: boolean;
        data: { rows?: UnlinkedBooking[] } | UnlinkedBooking[];
      }>('/api/user/bookings');
      const payload = data?.data;
      const rows = (payload && 'rows' in payload ? payload.rows : payload) || [];
      return Array.isArray(rows) ? rows.filter((b) => !b.b_event_id && !b.eventId) : [];
    },
    enabled: showLinkModal,
  });

  // Mutations
  const updateEventMutation = useUpdateEventMutation();
  const linkBookingMutation = useLinkBookingMutation();
  const unlinkBookingMutation = useUnlinkBookingMutation();
  const addChecklistMutation = useAddChecklistItemMutation();
  const updateChecklistMutation = useUpdateChecklistItemMutation();
  const deleteChecklistMutation = useDeleteChecklistItemMutation();
  const addTimelineMutation = useAddTimelineEntryMutation();
  const _updateTimelineMutation = useUpdateTimelineEntryMutation();
  const deleteTimelineMutation = useDeleteTimelineEntryMutation();

  const handleEditSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await updateEventMutation.mutateAsync({ id: eventId, ...data });
        setShowEditModal(false);
      } catch {
        Alert.alert('Error', 'Failed to update event.');
      }
    },
    [eventId, updateEventMutation],
  );

  const handleLinkBooking = useCallback(
    async (bookingId: number) => {
      try {
        await linkBookingMutation.mutateAsync({ eventId, bookingId });
        setShowLinkModal(false);
      } catch {
        Alert.alert('Error', 'Failed to link booking.');
      }
    },
    [eventId, linkBookingMutation],
  );

  const handleUnlinkBooking = useCallback(
    (bookingId: number) => {
      unlinkBookingMutation.mutate({ eventId, bookingId });
    },
    [eventId, unlinkBookingMutation],
  );

  const handleToggleChecklist = useCallback(
    (item: ChecklistItem) => {
      updateChecklistMutation.mutate({
        eventId,
        itemId: item.id,
        isCompleted: !item.isCompleted,
      });
    },
    [eventId, updateChecklistMutation],
  );

  const handleAddChecklistItem = useCallback(() => {
    if (!newChecklistTitle.trim()) return;
    addChecklistMutation.mutate({ eventId, title: newChecklistTitle.trim() });
    setNewChecklistTitle('');
  }, [eventId, newChecklistTitle, addChecklistMutation]);

  const handleDeleteChecklistItem = useCallback(
    (itemId: number) => {
      deleteChecklistMutation.mutate({ eventId, itemId });
    },
    [eventId, deleteChecklistMutation],
  );

  const handleAddTimelineEntry = useCallback(() => {
    if (!tlStartTime.trim() || !tlTitle.trim()) return;
    addTimelineMutation.mutate({
      eventId,
      startTime: tlStartTime.trim(),
      endTime: tlEndTime.trim() || undefined,
      title: tlTitle.trim(),
      description: tlDescription.trim() || undefined,
    });
    setTlStartTime('');
    setTlEndTime('');
    setTlTitle('');
    setTlDescription('');
    setShowTimelineForm(false);
  }, [eventId, tlStartTime, tlEndTime, tlTitle, tlDescription, addTimelineMutation]);

  const handleDeleteTimelineEntry = useCallback(
    (entryId: number) => {
      deleteTimelineMutation.mutate({ eventId, entryId });
    },
    [eventId, deleteTimelineMutation],
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) =>
    `\u20B1${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  // Loading state
  if (eventLoading || !event) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to events"
        >
          <Feather name="arrow-left" size={20} color={colors.primary[500]} />
          <Text style={styles.backText}>Events</Text>
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          <SkeletonListItem />
          <SkeletonListItem />
        </View>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[event.status] || STATUS_COLORS.planning;
  const checklistCompleted = checklist?.filter((c: ChecklistItem) => c.isCompleted).length || 0;
  const checklistTotal = checklist?.length || 0;

  // ── Render Helpers ──

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
            {event.status.replace('_', ' ')}
          </Text>
        </View>
        <Text style={styles.eventName}>{event.name}</Text>

        <View style={styles.infoRow}>
          <Feather name="calendar" size={16} color={semantic.textSecondary} />
          <Text style={styles.infoText}>
            {formatDate(event.date)}
            {event.endDate ? ` - ${formatDate(event.endDate)}` : ''}
          </Text>
        </View>

        {event.location && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={semantic.textSecondary} />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
        )}

        {event.guestCount !== null && event.guestCount !== undefined && event.guestCount > 0 && (
          <View style={styles.infoRow}>
            <Feather name="users" size={16} color={semantic.textSecondary} />
            <Text style={styles.infoText}>{event.guestCount} guests</Text>
          </View>
        )}

        {event.budget > 0 && (
          <View style={styles.infoRow}>
            <Feather name="credit-card" size={16} color={semantic.textSecondary} />
            <Text style={styles.infoText}>{formatCurrency(event.budget)} budget</Text>
          </View>
        )}

        {event.description && <Text style={styles.description}>{event.description}</Text>}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{bookings?.length || 0}</Text>
          <Text style={styles.statLabel}>Vendors</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {checklistCompleted}/{checklistTotal}
          </Text>
          <Text style={styles.statLabel}>Checklist</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{budget?.percentUsed || 0}%</Text>
          <Text style={styles.statLabel}>Budget Used</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => setShowEditModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Edit event"
      >
        <Feather name="edit-2" size={16} color={colors.neutral[0]} />
        <Text style={styles.editButtonText}>Edit Event</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderVendors = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setShowLinkModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Link a booking"
      >
        <Feather name="plus" size={18} color={colors.primary[500]} />
        <Text style={styles.linkButtonText}>Link Booking</Text>
      </TouchableOpacity>

      {!bookings || bookings.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Feather name="users" size={40} color={colors.neutral[300]} />
          <Text style={styles.infoLabel}>No vendors linked yet</Text>
        </View>
      ) : (
        bookings.map((b: EventBooking) => (
          <View key={b.id} style={styles.vendorCard}>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{b.serviceName || b.eventName}</Text>
              {b.providerName && <Text style={styles.vendorCategory}>{b.providerName}</Text>}
              {b.serviceCategory && <Text style={styles.vendorCategory}>{b.serviceCategory}</Text>}
              <Text style={styles.vendorCost}>{formatCurrency(b.totalCost)}</Text>
            </View>
            <TouchableOpacity
              style={styles.unlinkButton}
              onPress={() => handleUnlinkBooking(b.id)}
              accessibilityRole="button"
              accessibilityLabel={`Unlink ${b.serviceName || b.eventName}`}
            >
              <Feather name="x" size={16} color={colors.error[500]} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTimeline = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setShowTimelineForm(!showTimelineForm)}
        accessibilityRole="button"
        accessibilityLabel="Add timeline entry"
      >
        <Feather
          name={showTimelineForm ? 'chevron-up' : 'plus'}
          size={18}
          color={colors.primary[500]}
        />
        <Text style={styles.linkButtonText}>{showTimelineForm ? 'Cancel' : 'Add Entry'}</Text>
      </TouchableOpacity>

      {showTimelineForm && (
        <View style={styles.card}>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Start Time *</Text>
              <TextInput
                style={styles.formInput}
                value={tlStartTime}
                onChangeText={setTlStartTime}
                placeholder="HH:MM"
                placeholderTextColor={semantic.textMuted}
                accessibilityLabel="Start time"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>End Time</Text>
              <TextInput
                style={styles.formInput}
                value={tlEndTime}
                onChangeText={setTlEndTime}
                placeholder="HH:MM"
                placeholderTextColor={semantic.textMuted}
                accessibilityLabel="End time"
              />
            </View>
          </View>
          <Text style={styles.formLabel}>Title *</Text>
          <TextInput
            style={styles.formInput}
            value={tlTitle}
            onChangeText={setTlTitle}
            placeholder="e.g. Ceremony begins"
            placeholderTextColor={semantic.textMuted}
            accessibilityLabel="Timeline entry title"
          />
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={styles.formInput}
            value={tlDescription}
            onChangeText={setTlDescription}
            placeholder="Optional description"
            placeholderTextColor={semantic.textMuted}
            multiline
            accessibilityLabel="Timeline entry description"
          />
          <TouchableOpacity
            style={styles.formButton}
            onPress={handleAddTimelineEntry}
            accessibilityRole="button"
            accessibilityLabel="Add timeline entry"
          >
            <Text style={styles.formButtonText}>Add Entry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!timeline || timeline.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Feather name="clock" size={40} color={colors.neutral[300]} />
          <Text style={styles.infoLabel}>No timeline entries yet</Text>
        </View>
      ) : (
        timeline.map((entry: TimelineEntry, idx: number) => (
          <View key={entry.id} style={styles.timelineEntry}>
            <View style={styles.timelineTime}>
              <Text style={styles.timelineTimeText}>{entry.startTime?.slice(0, 5)}</Text>
              {entry.endTime && (
                <Text style={styles.timelineEndText}>{entry.endTime.slice(0, 5)}</Text>
              )}
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={styles.timelineDot} />
              {idx < timeline.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{entry.title}</Text>
              {entry.description && <Text style={styles.timelineDesc}>{entry.description}</Text>}
              {entry.bookingName && (
                <Text style={[styles.timelineDesc, { color: colors.primary[500] }]}>
                  Vendor: {entry.bookingName}
                </Text>
              )}
              <View style={styles.timelineActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteTimelineEntry(entry.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${entry.title}`}
                >
                  <Feather name="trash-2" size={14} color={colors.error[500]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderChecklist = () => {
    const completedCount = checklist?.filter((c: ChecklistItem) => c.isCompleted).length || 0;
    const total = checklist?.length || 0;
    const progressPercent = total > 0 ? (completedCount / total) * 100 : 0;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.progressText}>
            {completedCount} of {total} completed
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          {checklist && checklist.length > 0 ? (
            checklist.map((item: ChecklistItem) => {
              const isOverdue =
                item.dueDate && new Date(item.dueDate) < new Date() && !item.isCompleted;
              return (
                <View key={item.id} style={styles.checklistItem}>
                  <TouchableOpacity
                    style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]}
                    onPress={() => handleToggleChecklist(item)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.title} ${item.isCompleted ? 'completed' : 'pending'}`}
                  >
                    {item.isCompleted && (
                      <Feather name="check" size={14} color={colors.neutral[0]} />
                    )}
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.checklistTitle,
                      item.isCompleted && styles.checklistTitleCompleted,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.category && (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{item.category}</Text>
                    </View>
                  )}
                  {item.dueDate && (
                    <View style={[styles.dueDateBadge, isOverdue && styles.dueDateOverdue]}>
                      <Text style={[styles.dueDateText, isOverdue && styles.dueDateOverdueText]}>
                        {formatDate(item.dueDate)}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDeleteChecklistItem(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title}`}
                  >
                    <Feather name="trash-2" size={14} color={colors.error[500]} />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={styles.infoLabel}>No checklist items yet</Text>
            </View>
          )}

          <View style={styles.addItemRow}>
            <TextInput
              style={styles.addItemInput}
              value={newChecklistTitle}
              onChangeText={setNewChecklistTitle}
              placeholder="Add new item..."
              placeholderTextColor={semantic.textMuted}
              accessibilityLabel="New checklist item"
              onSubmitEditing={handleAddChecklistItem}
            />
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={handleAddChecklistItem}
              accessibilityRole="button"
              accessibilityLabel="Add checklist item"
            >
              <Feather name="plus" size={18} color={colors.neutral[0]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderBudget = () => {
    const percentUsed = budget?.percentUsed || 0;
    const barColor =
      percentUsed > 90
        ? colors.error[500]
        : percentUsed > 75
          ? colors.warning[500]
          : colors.success[500];
    const totalBudget = budget?.totalBudget || 0;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.budgetSummaryCard}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Total Budget</Text>
            <Text style={styles.budgetValue}>{formatCurrency(totalBudget)}</Text>
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Total Spent</Text>
            <Text style={styles.budgetValue}>{formatCurrency(budget?.totalSpent || 0)}</Text>
          </View>
          <View style={styles.budgetProgressBar}>
            <View
              style={[
                styles.budgetProgressFill,
                { width: `${Math.min(percentUsed, 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Remaining</Text>
            <Text
              style={[
                styles.budgetRemaining,
                { color: (budget?.remaining || 0) >= 0 ? colors.success[600] : colors.error[600] },
              ]}
            >
              {formatCurrency(budget?.remaining || 0)}
            </Text>
          </View>
        </View>

        {budget?.byCategory && budget.byCategory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>By Category</Text>
            {budget.byCategory.map((cat: { category: string; amount: number }, i: number) => (
              <View key={i} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{cat.category}</Text>
                <View style={styles.categoryBar}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      { width: `${totalBudget > 0 ? (cat.amount / totalBudget) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {bookings && bookings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vendor Costs</Text>
            {[...bookings]
              .sort((a: EventBooking, b: EventBooking) => b.totalCost - a.totalCost)
              .map((b: EventBooking) => (
                <View key={b.id} style={styles.categoryRow}>
                  <Text style={styles.categoryName}>{b.serviceName || b.eventName}</Text>
                  <Text style={styles.categoryAmount}>{formatCurrency(b.totalCost)}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const tabContent: Record<TabKey, () => React.ReactElement> = {
    overview: renderOverview,
    vendors: renderVendors,
    timeline: renderTimeline,
    checklist: renderChecklist,
    budget: renderBudget,
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to events"
      >
        <Feather name="arrow-left" size={20} color={colors.primary[500]} />
        <Text style={styles.backText}>Events</Text>
      </TouchableOpacity>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <View style={styles.content}>{tabContent[activeTab]()}</View>

      {/* Edit Event Modal */}
      <CreateEventModal
        visible={showEditModal}
        isEdit={true}
        initialData={event}
        isSubmitting={updateEventMutation.isPending}
        onSubmit={handleEditSubmit}
        onClose={() => setShowEditModal(false)}
      />

      {/* Link Booking Modal */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.linkModalOverlay}>
          <View style={styles.linkModalContainer}>
            <View style={styles.linkModalHeader}>
              <Text style={styles.linkModalTitle}>Link Booking</Text>
              <TouchableOpacity
                onPress={() => setShowLinkModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={24} color={semantic.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allBookings || []}
              keyExtractor={(item: UnlinkedBooking) => String(item.idbooking || item.id)}
              renderItem={({ item }: { item: UnlinkedBooking }) => (
                <TouchableOpacity
                  style={styles.linkModalItem}
                  onPress={() => handleLinkBooking(item.idbooking || item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Link ${item.b_event_name || item.eventName}`}
                >
                  <View>
                    <Text style={styles.linkModalItemName}>
                      {item.b_event_name || item.eventName}
                    </Text>
                    <Text style={styles.linkModalItemDate}>
                      {formatDate(item.b_event_date || item.eventDate)}
                    </Text>
                  </View>
                  <Feather name="plus-circle" size={20} color={colors.primary[500]} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.linkModalEmpty}>
                  <Feather name="inbox" size={32} color={colors.neutral[300]} />
                  <Text style={styles.linkModalEmptyText}>No unlinked bookings available</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
