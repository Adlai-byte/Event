import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { semantic } from '../theme';
import { useBreakpoints } from '../hooks/useBreakpoints';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface BookingWeekCalendarProps {
  currentWeek: Date;
  onWeekChange: (newWeek: Date) => void;
  availableSlots: TimeSlot[];
  selectedSlots: TimeSlot[];
  onSlotToggle: (slot: TimeSlot) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onTimeSlotClick?: (date: string, hour: number, minute: number) => void;
  noSlotsDates?: string[]; // Dates with no available slots
  isPerDayMode?: boolean; // For per-day services (24 hours)
  selectedDays?: string[]; // Selected days for per-day mode
  allDatesSlots?: Record<string, TimeSlot[]>; // Pre-loaded slots for all dates
}

export const BookingWeekCalendar: React.FC<BookingWeekCalendarProps> = ({
  currentWeek,
  onWeekChange,
  availableSlots,
  selectedSlots,
  onSlotToggle,
  selectedDate,
  onDateSelect,
  onTimeSlotClick,
  noSlotsDates = [],
  isPerDayMode = false,
  selectedDays = [],
  allDatesSlots = {},
}) => {
  const { screenWidth } = useBreakpoints();
  const styles = createStyles(screenWidth);

  // Ensure currentWeek is a valid Date
  const safeCurrentWeek =
    currentWeek instanceof Date && !isNaN(currentWeek.getTime()) ? currentWeek : new Date();

  // Get the start of the week (Monday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Get days of the week
  const getWeekDays = (): Date[] => {
    const start = getWeekStart(safeCurrentWeek);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      // Monday to Sunday
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Generate time slots (8 AM to 7 PM)
  const timeSlots: number[] = [];
  for (let hour = 8; hour <= 19; hour++) {
    timeSlots.push(hour);
  }

  // Format time for display
  const formatTime = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  // Format date for display
  const formatDateHeader = (date: Date): string => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    return days[dayIndex];
  };

  // Get available slots for a specific day
  const getSlotsForDay = (date: Date): TimeSlot[] => {
    const dateStr = date.toISOString().split('T')[0];
    if (isPerDayMode) return []; // Don't show slots in per-day mode
    if (selectedDate !== dateStr) return [];
    return availableSlots.filter((slot) => slot.available === true);
  };

  // Check if a day is selected (for per-day mode)
  const isDaySelectedForPerDay = (date: Date): boolean => {
    if (!isPerDayMode) return false;
    const dateStr = date.toISOString().split('T')[0];
    return selectedDays.includes(dateStr);
  };

  // Check if a specific hour is booked/unavailable
  // Now checks pre-loaded slots for all dates, not just selected date
  const isHourBooked = (date: Date, hour: number): boolean => {
    const dateStr = date.toISOString().split('T')[0];

    // Check pre-loaded slots for this date first
    const dateSlots = allDatesSlots[dateStr] || [];

    // If no pre-loaded slots, check selected date slots (fallback)
    const slotsToCheck =
      dateSlots.length > 0 ? dateSlots : selectedDate === dateStr ? availableSlots : [];

    if (slotsToCheck.length > 0) {
      // Check if any slot in this hour is marked as unavailable (booked)
      const hourStart = `${hour.toString().padStart(2, '0')}:00`;
      const hourEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;

      // Check if any unavailable slot overlaps with this hour
      const hasBookedSlot = slotsToCheck.some((slot) => {
        // Only check slots that are unavailable (booked)
        if (slot.available) return false;

        // Parse slot times (format: HH:MM or HH:MM:SS)
        const slotStartParts = slot.start.split(':').map(Number);
        const slotEndParts = slot.end.split(':').map(Number);
        const hourStartParts = hourStart.split(':').map(Number);
        const hourEndParts = hourEnd.split(':').map(Number);

        const slotStartMin = slotStartParts[0] * 60 + (slotStartParts[1] || 0);
        const slotEndMin = slotEndParts[0] * 60 + (slotEndParts[1] || 0);
        const hourStartMin = hourStartParts[0] * 60 + (hourStartParts[1] || 0);
        const hourEndMin = hourEndParts[0] * 60 + (hourEndParts[1] || 0);

        // Check if hour overlaps with booked slot
        // Two intervals overlap if: hourStart < slotEnd AND hourEnd > slotStart
        return hourStartMin < slotEndMin && hourEndMin > slotStartMin;
      });

      return hasBookedSlot;
    }

    return false;
  };

  // Check if a time slot is within available hours (8 AM - 7 PM)
  const isTimeAvailable = (hour: number): boolean => {
    return hour >= 8 && hour < 19;
  };

  // Handle time slot cell click - restrict booked/taken slots and dates with no slots
  const handleTimeSlotClick = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0];

    // RESTRICTION: Don't allow booking if date is in the past
    if (isDatePast(date)) {
      return; // Blocked - cannot book past dates
    }

    // RESTRICTION: Don't allow booking if date has no available slots
    if (isDateNoSlots(date)) {
      return; // Blocked - date has no available time slots
    }

    // RESTRICTION: Don't allow booking if hour is already booked/taken
    if (isHourBooked(date, hour)) {
      return; // Blocked - cannot select taken slots
    }

    // If no date is selected, select this date first
    if (!selectedDate) {
      onDateSelect(dateStr);
      // Create slot after date is selected
      setTimeout(() => {
        if (isTimeAvailable(hour) && !isHourBooked(date, hour)) {
          const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;
          const newSlot: TimeSlot = {
            start: startTime,
            end: endTime,
            available: true,
          };
          onSlotToggle(newSlot);
        }
      }, 150);
      return;
    }

    // Allow clicking on any date - auto-select if different
    if (dateStr !== selectedDate) {
      onDateSelect(dateStr);
      setTimeout(() => {
        if (isTimeAvailable(hour) && !isHourBooked(date, hour)) {
          const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;
          const newSlot: TimeSlot = {
            start: startTime,
            end: endTime,
            available: true,
          };
          onSlotToggle(newSlot);
        }
      }, 150);
      return;
    }

    // Check if time is within available hours (8 AM - 7 PM)
    if (!isTimeAvailable(hour)) {
      return;
    }

    // RESTRICTION: Double-check that slot is not booked before allowing selection
    if (isHourBooked(date, hour)) {
      return; // Blocked - cannot select taken slots
    }

    // Use custom handler if provided, otherwise create default 1-hour slot
    if (onTimeSlotClick) {
      onTimeSlotClick(dateStr, hour, 0);
    } else {
      // Default: create a 1-hour slot
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;

      // Check if this slot already exists in selected slots
      const existingSlot = selectedSlots.find((s) => s.start === startTime && s.end === endTime);
      if (existingSlot) {
        // Toggle off if already selected
        onSlotToggle(existingSlot);
      } else {
        // Check if this slot overlaps with already selected slots
        const newSlot: TimeSlot = {
          start: startTime,
          end: endTime,
          available: true,
        };

        // Check for overlaps with existing selected slots
        const hasOverlap = selectedSlots.some((selectedSlot) => {
          const [start1Hour, start1Min] = newSlot.start.split(':').map(Number);
          const [end1Hour, end1Min] = newSlot.end.split(':').map(Number);
          const [start2Hour, start2Min] = selectedSlot.start.split(':').map(Number);
          const [end2Hour, end2Min] = selectedSlot.end.split(':').map(Number);

          const start1Minutes = start1Hour * 60 + start1Min;
          const end1Minutes = end1Hour * 60 + end1Min;
          const start2Minutes = start2Hour * 60 + start2Min;
          const end2Minutes = end2Hour * 60 + end2Min;

          // Two intervals overlap if: start1 < end2 AND end1 > start2
          return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
        });

        if (hasOverlap) {
          Alert.alert(
            'Time Overlap',
            'This time slot overlaps with another selected slot. Please select non-overlapping time slots.',
            [{ text: 'OK' }],
          );
          return;
        }

        // Add new slot - only if available (not booked) and not overlapping
        onSlotToggle(newSlot);
      }
    }
  };

  // Check if a time slot is selected (by checking if any selected slot overlaps with this hour)
  // IMPORTANT: Only check slots for the currently selected date
  const isHourSelected = (date: Date, hour: number): boolean => {
    const dateStr = date.toISOString().split('T')[0];

    // Only check if this is the selected date
    // This prevents slots from other dates from appearing as selected
    if (!selectedDate || selectedDate !== dateStr) {
      return false; // Not the selected date, so no slots can be selected
    }

    // Only check selected slots if we're on the selected date
    return selectedSlots.some((slot) => {
      const slotStartHour = parseInt(slot.start.split(':')[0]);
      const slotEndHour = parseInt(slot.end.split(':')[0]);
      return hour >= slotStartHour && hour < slotEndHour;
    });
  };

  // Check if a slot is selected
  const isSlotSelected = (slot: TimeSlot): boolean => {
    return selectedSlots.some((s) => s.start === slot.start && s.end === slot.end);
  };

  // Check if slot selection is disabled (max 2 selected)
  const isSlotDisabled = (slot: TimeSlot): boolean => {
    if (isSlotSelected(slot)) return false;
    return selectedSlots.length >= 2;
  };

  // Calculate slot position and height
  const _getSlotStyle = (slot: TimeSlot): any => {
    const startParts = slot.start.split(':');
    const endParts = slot.end.split(':');

    const startHour = parseInt(startParts[0]);
    const startMin = parseInt(startParts[1] || '0');
    const endHour = parseInt(endParts[0]);
    const endMin = parseInt(endParts[1] || '0');

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;

    // Position from top (8 AM = 0, each hour = 40px for compact view)
    const topOffset = (startMinutes - 8 * 60) * (40 / 60);
    const height = duration * (40 / 60);

    const isSelected = isSlotSelected(slot);
    const isDisabled = isSlotDisabled(slot);

    return {
      position: 'absolute' as const,
      top: topOffset,
      left: 2,
      right: 2,
      height: Math.max(height, 40), // Minimum height
      backgroundColor: isSelected ? '#4285F4' : isDisabled ? '#E0E0E0' : '#E8F0FE',
      borderRadius: 4,
      padding: 6,
      zIndex: 10,
      opacity: isDisabled ? 0.5 : 1,
    };
  };

  const weekDays = getWeekDays();

  // Navigation
  const goToPreviousWeek = () => {
    const newWeek = new Date(safeCurrentWeek);
    newWeek.setDate(safeCurrentWeek.getDate() - 7);
    onWeekChange(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(safeCurrentWeek);
    newWeek.setDate(safeCurrentWeek.getDate() + 7);
    onWeekChange(newWeek);
  };

  const goToToday = () => {
    onWeekChange(new Date());
  };

  // Format month and year
  const getMonthYear = (): string => {
    return safeCurrentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Check if date is selected
  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === selectedDate;
  };

  // Check if date has no available slots
  const isDateNoSlots = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return noSlotsDates.includes(dateStr);
  };

  // Check if date is in the past
  const isDatePast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <View style={styles.container}>
      {/* Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goToPreviousWeek}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.monthYear}>{getMonthYear()}</Text>
        </View>
        <TouchableOpacity
          onPress={goToNextWeek}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goToToday}
          style={styles.todayButton}
          accessibilityRole="button"
          accessibilityLabel="Go to today"
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <ScrollView style={styles.scrollView} horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.calendarContainer}>
          {/* Time Column */}
          <View style={styles.timeColumn}>
            <View style={styles.timeHeader} />
            {timeSlots.map((hour) => (
              <View key={hour} style={styles.timeSlot}>
                <Text style={styles.timeText}>{formatTime(hour)}</Text>
              </View>
            ))}
          </View>

          {/* Days Columns */}
          <ScrollView
            style={styles.daysContainer}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {weekDays.map((day, index) => {
                const dateStr = day.toISOString().split('T')[0];
                const selected = isDateSelected(day);
                const noSlots = isDateNoSlots(day);
                const isPast = isDatePast(day);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayHeader,
                      selected && styles.dayHeaderSelected,
                      isPerDayMode && isDaySelectedForPerDay(day) && styles.dayHeaderSelected,
                      noSlots && styles.dayHeaderNoSlots,
                      isPast && styles.dayHeaderPast,
                    ]}
                    onPress={() => {
                      if (!noSlots && !isPast) {
                        if (isPerDayMode) {
                          // In per-day mode, just select the day (handled by parent)
                          onDateSelect(dateStr);
                        } else {
                          onDateSelect(dateStr);
                        }
                      }
                    }}
                    disabled={noSlots || isPast}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${formatDateHeader(day)} ${day.getDate()}`}
                  >
                    <Text
                      style={[
                        styles.dayName,
                        selected && styles.dayNameSelected,
                        isPerDayMode && isDaySelectedForPerDay(day) && styles.dayNameSelected,
                        noSlots && styles.dayNameNoSlots,
                        isPast && styles.dayNamePast,
                      ]}
                    >
                      {formatDateHeader(day)}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumber,
                        selected && styles.dayNumberSelected,
                        isPerDayMode && isDaySelectedForPerDay(day) && styles.dayNumberSelected,
                        noSlots && styles.dayNumberNoSlots,
                        isPast && styles.dayNumberPast,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    {isPerDayMode && isDaySelectedForPerDay(day) && (
                      <View style={styles.perDayCheckmark}>
                        <Text style={styles.perDayCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar Grid - Hide time slots in per-day mode */}
            {!isPerDayMode && (
              <View style={styles.calendarGrid}>
                {weekDays.map((day, dayIndex) => {
                  getSlotsForDay(day);
                  const noSlots = isDateNoSlots(day);
                  const isPast = isDatePast(day);

                  return (
                    <View
                      key={dayIndex}
                      style={[
                        styles.dayColumn,
                        noSlots && styles.dayColumnNoSlots,
                        isPast && styles.dayColumnPast,
                      ]}
                    >
                      {/* No Available Time Message - Hidden on mobile */}
                      {noSlots && Platform.OS === 'web' && (
                        <View style={styles.noAvailableTimeContainer}>
                          <Text style={styles.noAvailableTimeText}>No available time</Text>
                        </View>
                      )}
                      {/* Time Slots Container */}
                      <View style={styles.dayTimeSlots}>
                        {/* Render time slot cells */}
                        {timeSlots.map((hour) => {
                          const dateStr = day.toISOString().split('T')[0];
                          const isDaySelected = selectedDate === dateStr;
                          const isHourSelectedState = isHourSelected(day, hour);
                          const isHourBookedState = isHourBooked(day, hour);
                          const dateHasNoSlots = isDateNoSlots(day); // Check if date has no available slots
                          const isPast = isDatePast(day); // Check if date is in the past
                          const isClickable =
                            isTimeAvailable(hour) &&
                            !isHourBookedState &&
                            !dateHasNoSlots &&
                            !isPast; // Not clickable if date has no slots or is past
                          const isAvailable =
                            isTimeAvailable(hour) &&
                            !isHourBookedState &&
                            !dateHasNoSlots &&
                            !isPast; // Not available if date has no slots or is past

                          return (
                            <TouchableOpacity
                              key={hour}
                              style={[
                                styles.hourCell,
                                isPast && styles.hourCellPast, // White background for past dates
                                isHourBookedState && styles.hourCellBooked,
                                dateHasNoSlots && styles.hourCellNoSlots, // Red background for dates with no slots
                                isAvailable && !isHourSelectedState && styles.hourCellAvailable,
                                isHourSelectedState && styles.hourCellSelected,
                                isDaySelected &&
                                  !isHourBookedState &&
                                  !isHourSelectedState &&
                                  !dateHasNoSlots &&
                                  !isPast &&
                                  styles.hourCellDaySelected,
                              ]}
                              onPress={() => {
                                // Prevent clicking if date has no available slots or is past
                                if (!dateHasNoSlots && !isPast) {
                                  handleTimeSlotClick(day, hour);
                                }
                              }}
                              disabled={!isClickable || dateHasNoSlots || isPast}
                              activeOpacity={dateHasNoSlots || isPast ? 1 : 0.7}
                              accessibilityRole="button"
                              accessibilityLabel={`${formatTime(hour)} time slot${isHourBookedState ? ', taken' : isHourSelectedState ? ', selected' : ''}`}
                            >
                              {isHourSelectedState && <View style={styles.hourCellIndicator} />}
                              {isHourBookedState && (
                                <View style={styles.bookedIndicator}>
                                  <Text style={styles.bookedText}>Taken</Text>
                                  <Text style={styles.bookedSubtext}>Not available</Text>
                                </View>
                              )}
                              {isClickable &&
                                !isHourSelectedState &&
                                isDaySelected &&
                                !isHourBookedState &&
                                !dateHasNoSlots &&
                                !isPast && (
                                  <View style={styles.tapToBookContainer}>
                                    <Text style={styles.tapToBookText}>Tap to book</Text>
                                  </View>
                                )}
                            </TouchableOpacity>
                          );
                        })}

                        {/* Time slot blocks removed - users click directly on hour cells */}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (screenWidth: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: semantic.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      backgroundColor: semantic.surface,
    },
    navButton: {
      width: 44, // Better touch target for mobile
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 22,
      backgroundColor: 'transparent',
    },
    navButtonText: {
      fontSize: 24,
      color: '#5F6368',
      fontWeight: 'bold',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    monthYear: {
      fontSize: 16,
      fontWeight: '500',
      color: '#3C4043',
      flex: 1,
      textAlign: 'center',
    },
    todayButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: '#F1F3F4',
      marginLeft: 8,
      minHeight: 36, // Better touch target
    },
    todayButtonText: {
      fontSize: 14,
      color: '#1A73E8',
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
    },
    calendarContainer: {
      flexDirection: 'row',
      minWidth: screenWidth,
    },
    timeColumn: {
      width: 60, // Optimized for mobile
      borderRightWidth: 1,
      borderRightColor: '#E0E0E0',
    },
    timeHeader: {
      height: 40,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    timeSlot: {
      height: 40, // Match hourCell height
      justifyContent: 'flex-start',
      paddingTop: 2,
      paddingRight: 4,
      alignItems: 'flex-end',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F4',
    },
    timeText: {
      fontSize: 12,
      color: '#5F6368',
      fontWeight: '500',
    },
    daysContainer: {
      flex: 1,
    },
    dayHeaders: {
      flexDirection: 'row',
      height: 40,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    dayHeader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: '#E0E0E0',
      paddingVertical: 8,
    },
    dayHeaderSelected: {
      backgroundColor: '#E8F0FE',
    },
    dayHeaderNoSlots: {
      backgroundColor: '#FFCDD2', // Red background for dates with no slots
      opacity: 0.9,
    },
    dayHeaderPast: {
      backgroundColor: semantic.surface,
    },
    dayName: {
      fontSize: 11,
      color: '#5F6368',
      fontWeight: '500',
      marginBottom: 2,
    },
    dayNameSelected: {
      color: '#1A73E8',
    },
    dayNameNoSlots: {
      color: '#C62828', // Dark red text
    },
    dayNamePast: {
      color: '#9E9E9E', // Gray text for past dates
    },
    dayNumber: {
      fontSize: 16,
      color: '#3C4043',
      fontWeight: '500',
    },
    dayNumberSelected: {
      color: '#1A73E8',
      fontWeight: 'bold',
    },
    dayNumberNoSlots: {
      color: '#C62828', // Dark red text
      fontWeight: 'bold',
    },
    dayNumberPast: {
      color: '#9E9E9E', // Gray text for past dates
    },
    perDayCheckmark: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: semantic.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    perDayCheckmarkText: {
      color: semantic.surface,
      fontSize: 12,
      fontWeight: 'bold',
    },
    calendarGrid: {
      flexDirection: 'row',
    },
    dayColumn: {
      flex: 1,
      minWidth: 45, // Reduced for better mobile fit
      borderRightWidth: 1,
      borderRightColor: '#E0E0E0',
      position: 'relative',
    },
    dayColumnNoSlots: {
      backgroundColor: '#FFEBEE', // Light red background for days with no slots
    },
    dayColumnPast: {
      backgroundColor: semantic.surface,
    },
    noAvailableTimeContainer: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      transform: [{ translateY: -10 }],
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      paddingHorizontal: 8,
    },
    noAvailableTimeText: {
      fontSize: 10,
      color: '#C62828',
      fontWeight: '700',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      backgroundColor: semantic.surface,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    dayTimeSlots: {
      position: 'relative',
      minHeight: 400, // Reduced for better visibility (8 hours * 50px)
    },
    hourCell: {
      height: 40, // More compact for better visibility
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F4',
      position: 'relative',
      minHeight: 40,
    },
    hourCellAvailable: {
      backgroundColor: '#E8F5E9', // Green background for available
    },
    hourCellClickable: {
      backgroundColor: semantic.background,
    },
    hourCellDaySelected: {
      backgroundColor: '#F0F7FF',
    },
    hourCellBooked: {
      backgroundColor: '#FFCDD2', // Light red background for booked
      borderLeftWidth: 3,
      borderLeftColor: '#D32F2F', // Dark red border
    },
    hourCellNoSlots: {
      backgroundColor: '#FFEBEE', // Light red background for dates with no slots
      opacity: 0.6,
    },
    hourCellPast: {
      backgroundColor: semantic.surface,
      opacity: 0.5,
    },
    hourCellSelected: {
      backgroundColor: '#E3F2FD',
      borderLeftWidth: 3,
      borderLeftColor: '#4285F4',
    },
    bookedIndicator: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookedText: {
      fontSize: 11,
      color: '#D32F2F',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    bookedSubtext: {
      fontSize: 9,
      color: '#D32F2F',
      fontWeight: '500',
      opacity: 0.8,
    },
    hourCellIndicator: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: '#4285F4',
    },
    tapToBookContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tapToBookText: {
      fontSize: 10,
      color: '#9AA0A6',
      textAlign: 'center',
      fontWeight: '500',
    },
    slotTitle: {
      fontSize: 11,
      fontWeight: '500',
      color: '#1A73E8',
      marginBottom: 2,
    },
    slotTitleSelected: {
      color: semantic.surface,
    },
    slotSelectedText: {
      fontSize: 9,
      color: semantic.surface,
      opacity: 0.9,
    },
  });
