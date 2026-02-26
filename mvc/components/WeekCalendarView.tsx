import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useBreakpoints } from '../hooks/useBreakpoints';

interface BookingEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS or HH:MM
  endTime: string; // HH:MM:SS or HH:MM
  color?: string;
  status?: string;
}

interface WeekCalendarViewProps {
  bookings: BookingEvent[];
  currentWeek: Date;
  onWeekChange: (newWeek: Date) => void;
  onEventPress?: (event: BookingEvent) => void;
}

export const WeekCalendarView: React.FC<WeekCalendarViewProps> = ({
  bookings,
  currentWeek,
  onWeekChange,
  onEventPress,
}) => {
  const { screenWidth } = useBreakpoints();
  const styles = createStyles(screenWidth);
  // Get the start of the week (Monday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Get days of the week
  const getWeekDays = (): Date[] => {
    const start = getWeekStart(currentWeek);
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

  // Get all events for a specific day
  const getEventsForDay = (date: Date): BookingEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter((booking) => booking.date === dateStr);
  };

  // Calculate event position and height
  const getEventStyle = (event: BookingEvent, _date: Date): any => {
    const startParts = event.startTime.split(':');
    const endParts = event.endTime.split(':');

    const startHour = parseInt(startParts[0]);
    const startMin = parseInt(startParts[1] || '0');
    const endHour = parseInt(endParts[0]);
    const endMin = parseInt(endParts[1] || '0');

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;

    // Position from top (8 AM = 0, each hour = 60px)
    const topOffset = (startMinutes - 8 * 60) * (60 / 60);
    const height = duration * (60 / 60);

    // Default colors based on status or random
    const colors = [
      '#4285F4', // Blue
      '#34A853', // Green
      '#FBBC04', // Yellow
      '#EA4335', // Red
      '#9C27B0', // Purple
    ];
    const colorIndex = parseInt(event.id) % colors.length;
    const eventColor = event.color || colors[colorIndex];

    return {
      position: 'absolute' as const,
      top: topOffset,
      left: 2,
      right: 2,
      height: Math.max(height, 40), // Minimum height
      backgroundColor: eventColor,
      borderRadius: 4,
      padding: 6,
      zIndex: 10,
    };
  };

  const weekDays = getWeekDays();
  const _weekStart = getWeekStart(currentWeek);

  // Navigation
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() - 7);
    onWeekChange(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + 7);
    onWeekChange(newWeek);
  };

  const goToToday = () => {
    onWeekChange(new Date());
  };

  // Format month and year
  const getMonthYear = (): string => {
    return currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.monthYear}>{getMonthYear()}</Text>
        </View>
        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
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
              {weekDays.map((day, index) => (
                <View key={index} style={styles.dayHeader}>
                  <Text style={styles.dayName}>{formatDateHeader(day)}</Text>
                  <Text style={styles.dayNumber}>{day.getDate()}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {weekDays.map((day, dayIndex) => (
                <View key={dayIndex} style={styles.dayColumn}>
                  {/* Time Slots Container with Events */}
                  <View style={styles.dayTimeSlots}>
                    {/* Render time slot cells */}
                    {timeSlots.map((hour) => (
                      <View key={hour} style={styles.hourCell} />
                    ))}

                    {/* Render events on top of time slots */}
                    {getEventsForDay(day).map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={getEventStyle(event, day)}
                        onPress={() => onEventPress?.(event)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.eventTitle} numberOfLines={2}>
                          {event.title}
                        </Text>
                        <Text style={styles.eventTime} numberOfLines={1}>
                          {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
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
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      backgroundColor: '#FFFFFF',
    },
    navButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
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
      fontSize: 18,
      fontWeight: '500',
      color: '#3C4043',
    },
    todayButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 4,
      backgroundColor: '#F1F3F4',
      marginLeft: 8,
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
      width: 60,
      borderRightWidth: 1,
      borderRightColor: '#E0E0E0',
    },
    timeHeader: {
      height: 50,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    timeSlot: {
      height: 60,
      justifyContent: 'flex-start',
      paddingTop: 4,
      paddingRight: 8,
      alignItems: 'flex-end',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F4',
    },
    timeText: {
      fontSize: 11,
      color: '#5F6368',
    },
    daysContainer: {
      flex: 1,
    },
    dayHeaders: {
      flexDirection: 'row',
      height: 50,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    dayHeader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: '#E0E0E0',
    },
    dayName: {
      fontSize: 11,
      color: '#5F6368',
      fontWeight: '500',
      marginBottom: 2,
    },
    dayNumber: {
      fontSize: 16,
      color: '#3C4043',
      fontWeight: '500',
    },
    calendarGrid: {
      flexDirection: 'row',
    },
    dayColumn: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: '#E0E0E0',
      position: 'relative',
    },
    dayTimeSlots: {
      position: 'relative',
      minHeight: 720, // 12 hours * 60px per hour
    },
    hourCell: {
      height: 60,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F4',
      position: 'relative',
    },
    eventTitle: {
      fontSize: 12,
      fontWeight: '500',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    eventTime: {
      fontSize: 10,
      color: '#FFFFFF',
      opacity: 0.9,
    },
  });
