import React, { useState, useCallback, useMemo } from 'react';
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
import { CreateEventModal, InviteCollaboratorModal } from '../../components/event';
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
  useCloneEventMutation,
  useEventReminders,
  useAddReminderMutation,
  useDeleteReminderMutation,
  useEventCollaborators,
  useRemoveCollaboratorMutation,
  type EventStatus,
  type EventBooking,
  type ChecklistItem,
  type TimelineEntry,
  type EventReminder,
  type EventCollaborator,
} from '../../hooks/useEventData';
import { apiClient } from '../../services/apiClient';
import { useQuery } from '@tanstack/react-query';
import { createStyles } from './EventDetailView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { DateTimeInput } from '../../components/ui/DateTimeInput';
import { AppLayout } from '../../components/layout';

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
  planning: { bg: '#EFF6FF', text: '#2563EB' },
  upcoming: { bg: '#FEF3C7', text: '#D97706' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8' },
  completed: { bg: '#DCFCE7', text: '#059669' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  eventId,
  userEmail,
  user,
  onNavigate,
  onLogout,
  onBack,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Reminder form state
  const [reminderDate, setReminderDate] = useState('');
  const [reminderType, setReminderType] = useState<'push' | 'email' | 'both'>('push');
  const [reminderMessage, setReminderMessage] = useState('');

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
  const { data: reminders } = useEventReminders(activeTab === 'overview' ? eventId : null);
  const { data: collaborators } = useEventCollaborators(activeTab === 'overview' ? eventId : null);

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
  const cloneEventMutation = useCloneEventMutation();
  const addReminderMutation = useAddReminderMutation();
  const deleteReminderMutation = useDeleteReminderMutation();
  const removeCollaboratorMutation = useRemoveCollaboratorMutation();

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

  const handleCloneEvent = useCallback(async () => {
    try {
      const result = await cloneEventMutation.mutateAsync({ eventId });
      const cloned = (result as { data?: { id?: number } })?.data;
      if (cloned?.id) {
        onBack();
      }
    } catch {
      Alert.alert('Error', 'Failed to clone event.');
    }
  }, [eventId, cloneEventMutation, onBack]);

  const handleAddReminder = useCallback(() => {
    if (!reminderDate.trim()) return;
    addReminderMutation.mutate({
      eventId,
      remindAt: reminderDate.trim(),
      type: reminderType,
      message: reminderMessage.trim() || undefined,
    });
    setReminderDate('');
    setReminderMessage('');
  }, [eventId, reminderDate, reminderType, reminderMessage, addReminderMutation]);

  const handleDeleteReminder = useCallback(
    (reminderId: number) => {
      deleteReminderMutation.mutate({ eventId, reminderId });
    },
    [eventId, deleteReminderMutation],
  );

  const handleRemoveCollaborator = useCallback(
    (collabId: number) => {
      removeCollaboratorMutation.mutate({ eventId, collabId });
    },
    [eventId, removeCollaboratorMutation],
  );

  // Determine user's role for this event (returned by the API)
  const userRole = event?.userRole ?? 'viewer';

  const canEdit = userRole === 'owner' || userRole === 'editor';
  const isOwner = userRole === 'owner';

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
          <Feather name="arrow-left" size={20} color={'#2563EB'} />
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
          <Feather name="calendar" size={16} color={'#64748B'} />
          <Text style={styles.infoText}>
            {formatDate(event.date)}
            {event.endDate ? ` - ${formatDate(event.endDate)}` : ''}
          </Text>
        </View>

        {event.location && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={'#64748B'} />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
        )}

        {event.guestCount !== null && event.guestCount !== undefined && event.guestCount > 0 && (
          <View style={styles.infoRow}>
            <Feather name="users" size={16} color={'#64748B'} />
            <Text style={styles.infoText}>{event.guestCount} guests</Text>
          </View>
        )}

        {event.budget > 0 && (
          <View style={styles.infoRow}>
            <Feather name="credit-card" size={16} color={'#64748B'} />
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

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {isOwner && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowEditModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Edit event"
          >
            <Feather name="edit-2" size={16} color={'#FFFFFF'} />
            <Text style={styles.editButtonText}>Edit Event</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: '#DBEAFE' }]}
          onPress={handleCloneEvent}
          disabled={cloneEventMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Clone event as template"
        >
          <Feather name="copy" size={16} color={'#1D4ED8'} />
          <Text style={[styles.editButtonText, { color: '#1D4ED8' }]}>
            {cloneEventMutation.isPending ? 'Cloning...' : 'Clone'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reminders Section */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>Reminders</Text>
        {reminders && reminders.length > 0 ? (
          reminders.map((r: EventReminder) => (
            <View key={r.id} style={styles.checklistItem}>
              <Feather
                name="bell"
                size={16}
                color={r.isSent ? '#94A3B8' : '#2563EB'}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.infoText}>{new Date(r.remindAt).toLocaleString()}</Text>
                {r.message && <Text style={styles.infoLabel}>{r.message}</Text>}
              </View>
              <View style={[styles.categoryTag, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.categoryTagText, { color: '#1D4ED8' }]}>
                  {r.type}
                </Text>
              </View>
              {isOwner && !r.isSent && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleDeleteReminder(r.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete reminder`}
                >
                  <Feather name="trash-2" size={14} color={'#EF4444'} />
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.infoLabel}>No reminders set</Text>
        )}
        {isOwner && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.formLabel}>Date & Time</Text>
            <DateTimeInput
              style={styles.formInput}
              value={reminderDate}
              onChange={setReminderDate}
              placeholder="2026-03-10 09:00"
              placeholderTextColor={'#94A3B8'}
              accessibilityLabel="Reminder date and time"
              type="datetime"
            />
            <Text style={styles.formLabel}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {(['push', 'email', 'both'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.categoryTag,
                    reminderType === t && { backgroundColor: '#2563EB' },
                  ]}
                  onPress={() => setReminderType(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`Reminder type ${t}`}
                >
                  <Text
                    style={[
                      styles.categoryTagText,
                      reminderType === t && { color: '#FFFFFF' },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.formLabel}>Message (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={reminderMessage}
              onChangeText={setReminderMessage}
              placeholder="Optional reminder message"
              placeholderTextColor={'#94A3B8'}
              accessibilityLabel="Reminder message"
            />
            <TouchableOpacity
              style={styles.formButton}
              onPress={handleAddReminder}
              accessibilityRole="button"
              accessibilityLabel="Add reminder"
            >
              <Text style={styles.formButtonText}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Collaborators Section */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={styles.cardTitle}>Collaborators</Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setShowInviteModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Invite collaborator"
            >
              <Feather name="user-plus" size={16} color={'#2563EB'} />
              <Text style={styles.linkButtonText}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
        {collaborators && collaborators.length > 0 ? (
          collaborators.map((c: EventCollaborator) => (
            <View key={c.id} style={styles.checklistItem}>
              <Feather name="user" size={16} color={'#64748B'} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.infoText}>{c.userName || c.userEmail}</Text>
                {c.userName && <Text style={styles.infoLabel}>{c.userEmail}</Text>}
              </View>
              <View
                style={[
                  styles.categoryTag,
                  {
                    backgroundColor: c.role === 'editor' ? '#EFF6FF' : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryTagText,
                    { color: c.role === 'editor' ? '#1D4ED8' : '#475569' },
                  ]}
                >
                  {c.role}
                </Text>
              </View>
              {c.status === 'pending' && (
                <View style={[styles.dueDateBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.dueDateText, { color: '#D97706' }]}>Pending</Text>
                </View>
              )}
              {isOwner && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleRemoveCollaborator(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${c.userName || c.userEmail}`}
                >
                  <Feather name="x" size={14} color={'#EF4444'} />
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.infoLabel}>No collaborators yet</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderVendors = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {isOwner && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setShowLinkModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Link a booking"
        >
          <Feather name="plus" size={18} color={'#2563EB'} />
          <Text style={styles.linkButtonText}>Link Booking</Text>
        </TouchableOpacity>
      )}

      {!bookings || bookings.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Feather name="users" size={40} color={'#CBD5E1'} />
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
            {isOwner && (
              <TouchableOpacity
                style={styles.unlinkButton}
                onPress={() => handleUnlinkBooking(b.id)}
                accessibilityRole="button"
                accessibilityLabel={`Unlink ${b.serviceName || b.eventName}`}
              >
                <Feather name="x" size={16} color={'#EF4444'} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderTimeline = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {canEdit && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setShowTimelineForm(!showTimelineForm)}
          accessibilityRole="button"
          accessibilityLabel="Add timeline entry"
        >
          <Feather
            name={showTimelineForm ? 'chevron-up' : 'plus'}
            size={18}
            color={'#2563EB'}
          />
          <Text style={styles.linkButtonText}>{showTimelineForm ? 'Cancel' : 'Add Entry'}</Text>
        </TouchableOpacity>
      )}

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
                placeholderTextColor={'#94A3B8'}
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
                placeholderTextColor={'#94A3B8'}
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
            placeholderTextColor={'#94A3B8'}
            accessibilityLabel="Timeline entry title"
          />
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={styles.formInput}
            value={tlDescription}
            onChangeText={setTlDescription}
            placeholder="Optional description"
            placeholderTextColor={'#94A3B8'}
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
          <Feather name="clock" size={40} color={'#CBD5E1'} />
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
                <Text style={[styles.timelineDesc, { color: '#2563EB' }]}>
                  Vendor: {entry.bookingName}
                </Text>
              )}
              {canEdit && (
                <View style={styles.timelineActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDeleteTimelineEntry(entry.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${entry.title}`}
                  >
                    <Feather name="trash-2" size={14} color={'#EF4444'} />
                  </TouchableOpacity>
                </View>
              )}
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
                    onPress={() => canEdit && handleToggleChecklist(item)}
                    disabled={!canEdit}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.title} ${item.isCompleted ? 'completed' : 'pending'}`}
                  >
                    {item.isCompleted && (
                      <Feather name="check" size={14} color={'#FFFFFF'} />
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
                  {canEdit && (
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteChecklistItem(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title}`}
                    >
                      <Feather name="trash-2" size={14} color={'#EF4444'} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={styles.infoLabel}>No checklist items yet</Text>
            </View>
          )}

          {canEdit && (
            <View style={styles.addItemRow}>
              <TextInput
                style={styles.addItemInput}
                value={newChecklistTitle}
                onChangeText={setNewChecklistTitle}
                placeholder="Add new item..."
                placeholderTextColor={'#94A3B8'}
                accessibilityLabel="New checklist item"
                onSubmitEditing={handleAddChecklistItem}
              />
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddChecklistItem}
                accessibilityRole="button"
                accessibilityLabel="Add checklist item"
              >
                <Feather name="plus" size={18} color={'#FFFFFF'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderBudget = () => {
    const percentUsed = budget?.percentUsed || 0;
    const barColor =
      percentUsed > 90
        ? '#EF4444'
        : percentUsed > 75
          ? '#F59E0B'
          : '#22C55E';
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
                { color: (budget?.remaining || 0) >= 0 ? '#059669' : '#DC2626' },
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
    <AppLayout
      role="user"
      activeRoute="events"
      title="Event Details"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to events"
        >
          <Feather name="arrow-left" size={20} color={'#2563EB'} />
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

        {/* Invite Collaborator Modal */}
        <InviteCollaboratorModal
          visible={showInviteModal}
          eventId={eventId}
          onClose={() => setShowInviteModal(false)}
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
                  <Feather name="x" size={24} color={'#64748B'} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={allBookings || []}
                keyExtractor={(item: UnlinkedBooking) => String(item.idbooking || item.id)}
                renderItem={({ item }: { item: UnlinkedBooking }) => (
                  <TouchableOpacity
                    style={styles.linkModalItem}
                    onPress={() => handleLinkBooking((item.idbooking || item.id) as number)}
                    accessibilityRole="button"
                    accessibilityLabel={`Link ${item.b_event_name || item.eventName || ''}`}
                  >
                    <View>
                      <Text style={styles.linkModalItemName}>
                        {item.b_event_name || item.eventName}
                      </Text>
                      <Text style={styles.linkModalItemDate}>
                        {formatDate((item.b_event_date || item.eventDate) ?? '')}
                      </Text>
                    </View>
                    <Feather name="plus-circle" size={20} color={'#2563EB'} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.linkModalEmpty}>
                    <Feather name="inbox" size={32} color={'#CBD5E1'} />
                    <Text style={styles.linkModalEmptyText}>No unlinked bookings available</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
};
