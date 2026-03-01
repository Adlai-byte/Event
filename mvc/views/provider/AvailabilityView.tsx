import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { SkeletonCard } from '../../components/ui';
import { semantic } from '../../theme';
import { createStyles } from './AvailabilityView.styles';
import { apiClient } from '../../services/apiClient';
import {
  useBlockedDates,
  useBlockDateMutation,
  useUnblockDateMutation,
  useSchedule,
  useUpdateScheduleMutation,
  BlockedDate,
  ScheduleEntry,
} from '../../hooks/useProviderAvailability';

interface AvailabilityViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface ProviderService {
  id: number;
  serviceName: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const DEFAULT_SCHEDULE: ScheduleEntry[] = DAY_FULL_NAMES.map((_, i) => ({
  dayOfWeek: i,
  startTime: '08:00',
  endTime: '17:00',
  isAvailable: i >= 1 && i <= 5, // Mon-Fri available by default
}));

export const AvailabilityView: React.FC<AvailabilityViewProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Booked dates state (fetched from provider bookings)
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  // Block modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Schedule state
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [localSchedule, setLocalSchedule] = useState<ScheduleEntry[]>(DEFAULT_SCHEDULE);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [scheduleSaveMessage, setScheduleSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute date range for blocked dates query
  const startDate = useMemo(
    () => formatDate(currentMonth.year, currentMonth.month, 1),
    [currentMonth],
  );
  const endDate = useMemo(
    () =>
      formatDate(
        currentMonth.year,
        currentMonth.month,
        getDaysInMonth(currentMonth.year, currentMonth.month),
      ),
    [currentMonth],
  );

  // Hooks
  const { data: blockedDates, isLoading: blockedLoading } = useBlockedDates(startDate, endDate);
  const blockMutation = useBlockDateMutation();
  const unblockMutation = useUnblockDateMutation();

  const { data: scheduleData, isLoading: scheduleLoading } = useSchedule(selectedServiceId || 0);
  const updateScheduleMutation = useUpdateScheduleMutation();

  // Load provider services
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    const loadServices = async () => {
      try {
        setServicesLoading(true);
        const data = await apiClient.get<{ ok: boolean; services?: ProviderService[] }>(
          '/api/services',
          { providerEmail: user.email },
        );
        if (!cancelled && data.ok && data.services) {
          setServices(data.services);
          if (data.services.length > 0 && !selectedServiceId) {
            setSelectedServiceId(data.services[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    };
    loadServices();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  // Fetch booked dates for the current month
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    const fetchBookedDates = async () => {
      try {
        const response = await apiClient.get<{ ok: boolean; rows?: any[] }>('/provider/bookings', {
          providerEmail: user.email,
        });
        if (cancelled) return;
        const rows = response.rows || [];
        const dates = new Set<string>();
        for (const booking of rows) {
          if (booking.b_event_date && ['pending', 'confirmed'].includes(booking.b_status)) {
            const dateStr = booking.b_event_date.split('T')[0];
            // Only include dates in the current month
            if (dateStr >= startDate && dateStr <= endDate) {
              dates.add(dateStr);
            }
          }
        }
        setBookedDates(dates);
      } catch {
        // silently fail — booked dates are informational
      }
    };
    fetchBookedDates();
    return () => {
      cancelled = true;
    };
  }, [currentMonth, user?.email, startDate, endDate]);

  // Sync schedule data to local state
  useEffect(() => {
    if (scheduleData && Array.isArray(scheduleData) && scheduleData.length > 0) {
      setLocalSchedule(scheduleData);
    } else if (selectedServiceId) {
      setLocalSchedule(DEFAULT_SCHEDULE);
    }
  }, [scheduleData, selectedServiceId]);

  // Build blocked dates map for quick lookup
  const blockedDatesMap = useMemo(() => {
    const map = new Map<string, BlockedDate>();
    if (blockedDates && Array.isArray(blockedDates)) {
      for (const bd of blockedDates) {
        map.set(bd.date, bd);
      }
    }
    return map;
  }, [blockedDates]);

  // Calendar helpers
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth.year, currentMonth.month),
    [currentMonth],
  );
  const firstDayOffset = useMemo(
    () => getFirstDayOfMonth(currentMonth.year, currentMonth.month),
    [currentMonth],
  );

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }, []);

  // Day press handler
  const handleDayPress = useCallback(
    (day: number) => {
      const dateStr = formatDate(currentMonth.year, currentMonth.month, day);
      if (dateStr < today) return; // ignore past dates
      setSelectedDate(dateStr);
      setBlockReason('');
      setShowBlockModal(true);
    },
    [currentMonth, today],
  );

  // Block/unblock handlers
  const handleBlockDate = useCallback(() => {
    if (!selectedDate) return;
    blockMutation.mutate(
      { date: selectedDate, reason: blockReason || undefined },
      {
        onSuccess: () => {
          setShowBlockModal(false);
          setSelectedDate(null);
          setBlockReason('');
        },
      },
    );
  }, [selectedDate, blockReason, blockMutation]);

  const handleUnblockDate = useCallback(
    (blockedDate: BlockedDate) => {
      unblockMutation.mutate(blockedDate.id, {
        onSuccess: () => {
          setShowBlockModal(false);
          setSelectedDate(null);
        },
      });
    },
    [unblockMutation],
  );

  // Schedule handlers
  const handleToggleDay = useCallback((dayOfWeek: number) => {
    setLocalSchedule((prev) =>
      prev.map((entry) =>
        entry.dayOfWeek === dayOfWeek ? { ...entry, isAvailable: !entry.isAvailable } : entry,
      ),
    );
  }, []);

  const handleTimeChange = useCallback(
    (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
      setLocalSchedule((prev) =>
        prev.map((entry) => (entry.dayOfWeek === dayOfWeek ? { ...entry, [field]: value } : entry)),
      );
    },
    [],
  );

  const handleSaveSchedule = useCallback(() => {
    if (!selectedServiceId) return;
    setScheduleSaveMessage(null);
    updateScheduleMutation.mutate(
      { serviceId: selectedServiceId, schedule: localSchedule },
      {
        onSuccess: () => {
          setScheduleSaveMessage({ type: 'success', text: 'Schedule saved successfully!' });
          setTimeout(() => setScheduleSaveMessage(null), 3000);
        },
        onError: () => {
          setScheduleSaveMessage({
            type: 'error',
            text: 'Failed to save schedule. Please try again.',
          });
          setTimeout(() => setScheduleSaveMessage(null), 3000);
        },
      },
    );
  }, [selectedServiceId, localSchedule, updateScheduleMutation]);

  // Get the selected service name
  const selectedServiceName = useMemo(() => {
    if (!selectedServiceId) return '';
    const svc = services.find((s) => s.id === selectedServiceId);
    return svc?.serviceName || '';
  }, [selectedServiceId, services]);

  // Determine the currently selected blocked date (if it is blocked)
  const selectedBlockedDate = useMemo(() => {
    if (!selectedDate) return null;
    return blockedDatesMap.get(selectedDate) || null;
  }, [selectedDate, blockedDatesMap]);

  // Render calendar grid
  const renderCalendar = () => {
    const cells: React.ReactNode[] = [];

    // Day of week headers
    for (let i = 0; i < 7; i++) {
      cells.push(
        <View key={`header-${i}`} style={styles.dayOfWeekHeader}>
          <Text style={styles.dayOfWeekText}>{DAY_NAMES[i]}</Text>
        </View>,
      );
    }

    // Empty cells for offset
    for (let i = 0; i < firstDayOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={[styles.dayCell, styles.dayEmpty]} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(currentMonth.year, currentMonth.month, day);
      const isPast = dateStr < today;
      const isToday = dateStr === today;
      const isBlocked = blockedDatesMap.has(dateStr);
      const isBooked = bookedDates.has(dateStr);
      const isSelected = dateStr === selectedDate;

      // Determine cell style — priority: past > blocked > booked > available
      const cellStyles: StyleProp<ViewStyle> = [styles.dayCellInner];
      if (isPast) cellStyles.push(styles.dayPast);
      else if (isBlocked) cellStyles.push(styles.dayBlocked);
      else if (isBooked) cellStyles.push(styles.dayBooked);
      else cellStyles.push(styles.dayAvailable);
      if (isToday) cellStyles.push(styles.dayToday);
      if (isSelected) cellStyles.push(styles.daySelected);

      cells.push(
        <View key={`day-${day}`} style={styles.dayCell}>
          <TouchableOpacity
            style={cellStyles}
            onPress={() => handleDayPress(day)}
            disabled={isPast}
            accessibilityRole="button"
            accessibilityLabel={`${MONTH_NAMES[currentMonth.month]} ${day}, ${currentMonth.year}${isPast ? ', past date' : isBlocked ? ', blocked' : isBooked ? ', booked' : ', available'}`}
          >
            <Text style={[styles.dayText, isPast && { opacity: 0.4 }]}>{day}</Text>
          </TouchableOpacity>
        </View>,
      );
    }

    return cells;
  };

  // Render schedule rows
  const renderScheduleRows = () => {
    return localSchedule.map((entry) => (
      <View key={entry.dayOfWeek} style={styles.scheduleRow}>
        <Text style={styles.scheduleDayName}>
          {isMobile ? DAY_NAMES[entry.dayOfWeek] : DAY_FULL_NAMES[entry.dayOfWeek]}
        </Text>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            entry.isAvailable ? styles.toggleButtonOn : styles.toggleButtonOff,
          ]}
          onPress={() => handleToggleDay(entry.dayOfWeek)}
          accessibilityRole="button"
          accessibilityLabel={`${DAY_FULL_NAMES[entry.dayOfWeek]} availability toggle, currently ${entry.isAvailable ? 'on' : 'off'}`}
        >
          <View style={styles.toggleKnob} />
        </TouchableOpacity>
        <TextInput
          style={[styles.timeInput, !entry.isAvailable && styles.timeInputDisabled]}
          value={entry.startTime}
          onChangeText={(val) => handleTimeChange(entry.dayOfWeek, 'startTime', val)}
          editable={entry.isAvailable}
          placeholder="08:00"
          placeholderTextColor={semantic.textMuted}
          accessibilityLabel={`${DAY_FULL_NAMES[entry.dayOfWeek]} start time`}
        />
        <Text style={styles.timeSeparator}>to</Text>
        <TextInput
          style={[styles.timeInput, !entry.isAvailable && styles.timeInputDisabled]}
          value={entry.endTime}
          onChangeText={(val) => handleTimeChange(entry.dayOfWeek, 'endTime', val)}
          editable={entry.isAvailable}
          placeholder="17:00"
          placeholderTextColor={semantic.textMuted}
          accessibilityLabel={`${DAY_FULL_NAMES[entry.dayOfWeek]} end time`}
        />
      </View>
    ));
  };

  return (
    <AppLayout
      role="provider"
      activeRoute="availability"
      title="Availability"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Availability Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage your calendar and set weekly schedules for your services
          </Text>
        </View>

        {/* Two-column layout */}
        <View style={styles.sectionContainer}>
          {/* Left: Calendar */}
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>Calendar</Text>

            {/* Month navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={goToPrevMonth}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Feather name="chevron-left" size={20} color={semantic.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
              </Text>
              <TouchableOpacity
                style={styles.navButton}
                onPress={goToNextMonth}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Feather name="chevron-right" size={20} color={semantic.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Calendar grid */}
            {blockedLoading ? (
              <View style={styles.loadingContainer}>
                <SkeletonCard />
              </View>
            ) : (
              <View style={styles.calendarGrid}>{renderCalendar()}</View>
            )}

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotAvailable]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotBlocked]} />
                <Text style={styles.legendText}>Blocked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotBooked]} />
                <Text style={styles.legendText}>Booked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendDotPast]} />
                <Text style={styles.legendText}>Past</Text>
              </View>
            </View>
          </View>

          {/* Right: Weekly Schedule */}
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>

            {/* Service selector */}
            <View style={styles.serviceSelector}>
              <Text style={styles.serviceSelectorLabel}>Select Service</Text>
              {servicesLoading ? (
                <SkeletonCard />
              ) : services.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No services found. Create a service first to set up a schedule.
                  </Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.serviceSelectorDropdown}
                    onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select service, currently ${selectedServiceName || 'none selected'}`}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        color: selectedServiceId ? semantic.textPrimary : semantic.textMuted,
                      }}
                    >
                      {selectedServiceName || 'Choose a service...'}
                    </Text>
                  </TouchableOpacity>

                  {showServiceDropdown && (
                    <ScrollView style={styles.serviceDropdownList} nestedScrollEnabled>
                      {services.map((svc) => (
                        <TouchableOpacity
                          key={svc.id}
                          style={[
                            styles.serviceDropdownItem,
                            svc.id === selectedServiceId && styles.serviceDropdownItemActive,
                          ]}
                          onPress={() => {
                            setSelectedServiceId(svc.id);
                            setShowServiceDropdown(false);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${svc.serviceName}`}
                        >
                          <Text
                            style={[
                              styles.serviceDropdownItemText,
                              svc.id === selectedServiceId && styles.serviceDropdownItemTextActive,
                            ]}
                          >
                            {svc.serviceName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}
            </View>

            {/* Schedule rows */}
            {selectedServiceId ? (
              scheduleLoading ? (
                <View style={styles.loadingContainer}>
                  <SkeletonCard />
                  <SkeletonCard />
                </View>
              ) : (
                <>
                  {/* Header row */}
                  <View style={styles.scheduleHeaderRow}>
                    <Text style={[styles.scheduleHeaderText, styles.scheduleHeaderDayCol]}>
                      Day
                    </Text>
                    <Text style={[styles.scheduleHeaderText, styles.scheduleHeaderToggleCol]}>
                      On
                    </Text>
                    <Text style={[styles.scheduleHeaderText, styles.scheduleHeaderTimeCol]}>
                      Start
                    </Text>
                    <Text style={[styles.scheduleHeaderText, { width: 14 }]}> </Text>
                    <Text style={[styles.scheduleHeaderText, styles.scheduleHeaderTimeCol]}>
                      End
                    </Text>
                  </View>

                  {renderScheduleRows()}

                  {/* Save button */}
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      updateScheduleMutation.isPending && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSaveSchedule}
                    disabled={updateScheduleMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Save schedule"
                  >
                    {updateScheduleMutation.isPending ? (
                      <ActivityIndicator size="small" color={semantic.surface} />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Schedule</Text>
                    )}
                  </TouchableOpacity>

                  {/* Save message */}
                  {scheduleSaveMessage && (
                    <View
                      style={[
                        styles.messageContainer,
                        scheduleSaveMessage.type === 'success'
                          ? styles.successMessage
                          : styles.errorMessage,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          scheduleSaveMessage.type === 'success'
                            ? styles.successMessageText
                            : styles.errorMessageText,
                        ]}
                      >
                        {scheduleSaveMessage.text}
                      </Text>
                    </View>
                  )}
                </>
              )
            ) : (
              !servicesLoading &&
              services.length > 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Select a service to manage its schedule.
                  </Text>
                </View>
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* Block/Unblock Modal */}
      <Modal visible={showBlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedBlockedDate ? 'Unblock Date' : 'Block Date'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowBlockModal(false);
                  setSelectedDate(null);
                  setBlockReason('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <Feather name="x" size={20} color={semantic.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDateText}>
                {selectedDate
                  ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : ''}
              </Text>

              {selectedBlockedDate ? (
                <>
                  <Text style={styles.emptyStateText}>This date is currently blocked.</Text>
                  {selectedBlockedDate.reason && (
                    <Text style={styles.blockedReasonText}>
                      Reason: {selectedBlockedDate.reason}
                    </Text>
                  )}
                </>
              ) : (
                <TextInput
                  style={styles.reasonInput}
                  value={blockReason}
                  onChangeText={setBlockReason}
                  placeholder="Reason for blocking (optional)"
                  placeholderTextColor={semantic.textMuted}
                  multiline
                  accessibilityLabel="Block reason"
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowBlockModal(false);
                  setSelectedDate(null);
                  setBlockReason('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {selectedBlockedDate ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalUnblockButton]}
                  onPress={() => handleUnblockDate(selectedBlockedDate)}
                  disabled={unblockMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Unblock this date"
                >
                  {unblockMutation.isPending ? (
                    <ActivityIndicator size="small" color={semantic.surface} />
                  ) : (
                    <Text style={styles.modalBlockButtonText}>Unblock</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalBlockButton]}
                  onPress={handleBlockDate}
                  disabled={blockMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Block this date"
                >
                  {blockMutation.isPending ? (
                    <ActivityIndicator size="small" color={semantic.surface} />
                  ) : (
                    <Text style={styles.modalBlockButtonText}>Block</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
};
