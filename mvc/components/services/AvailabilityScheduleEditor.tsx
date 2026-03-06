import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { apiClient } from '../../services/apiClient';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Props {
  serviceId: number;
  onComplete: () => void;
}

export const AvailabilityScheduleEditor: React.FC<Props> = ({ serviceId, onComplete }) => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: '09:00',
      endTime: i === 0 ? '16:00' : '18:00',
      isAvailable: i !== 0, // closed Sunday by default
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get(`/api/provider/availability/schedule?serviceId=${serviceId}`)
      .then((data: any) => {
        if (data?.schedule && data.schedule.length > 0) {
          const merged = DAYS.map((_, i) => {
            const existing = data.schedule.find(
              (s: any) => s.dayOfWeek === i || s.sa_day_of_week === i,
            );
            if (existing) {
              return {
                dayOfWeek: i,
                startTime: existing.startTime || existing.sa_start_time || '09:00',
                endTime: existing.endTime || existing.sa_end_time || '18:00',
                isAvailable:
                  existing.isAvailable !== undefined
                    ? existing.isAvailable
                    : existing.sa_is_available !== undefined
                      ? !!existing.sa_is_available
                      : true,
              };
            }
            return {
              dayOfWeek: i,
              startTime: '09:00',
              endTime: i === 0 ? '16:00' : '18:00',
              isAvailable: i !== 0,
            };
          });
          setSchedule(merged);
        }
      })
      .catch(() => {
        /* use defaults */
      });
  }, [serviceId]);

  const toggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayIndex ? { ...d, isAvailable: !d.isAvailable } : d)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.put('/api/provider/availability/schedule', {
        serviceId,
        schedule: schedule.filter((d) => d.isAvailable),
      });
      onComplete();
    } catch (err: any) {
      setError(err?.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
        Set Availability Schedule
      </Text>
      <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        Toggle which days you're available and set your working hours. You can change this later.
      </Text>

      {error ? (
        <View
          style={{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }}
        >
          <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {DAYS.map((day, i) => (
        <View
          key={day}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Switch
              value={schedule[i].isAvailable}
              onValueChange={() => toggleDay(i)}
              trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
              thumbColor={schedule[i].isAvailable ? '#2563EB' : '#94A3B8'}
              accessibilityLabel={`${day} availability toggle`}
            />
            <Text
              style={{
                fontSize: 14,
                color: schedule[i].isAvailable ? '#0F172A' : '#94A3B8',
                fontWeight: schedule[i].isAvailable ? '500' : '400',
                width: 100,
              }}
            >
              {day}
            </Text>
          </View>
          {schedule[i].isAvailable && (
            <Text style={{ fontSize: 13, color: '#64748B' }}>
              {schedule[i].startTime} - {schedule[i].endTime}
            </Text>
          )}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          onPress={onComplete}
          accessibilityRole="button"
          accessibilityLabel="Skip availability setup"
        >
          <Text style={{ color: '#64748B', fontWeight: '500', fontSize: 14 }}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#0F172A',
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save availability schedule"
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
            {saving ? 'Saving...' : 'Save Schedule'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
