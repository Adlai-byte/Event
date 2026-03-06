import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic } from '../../theme';
import { getShadowStyle } from '../../utils/shadowStyles';
import { useInviteCollaboratorMutation, type CollaboratorRole } from '../../hooks/useEventData';

interface InviteCollaboratorModalProps {
  visible: boolean;
  eventId: number;
  onClose: () => void;
}

export const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({
  visible,
  eventId,
  onClose,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('viewer');
  const inviteMutation = useInviteCollaboratorMutation();

  const handleSubmit = async () => {
    if (!email.trim()) return;
    try {
      await inviteMutation.mutateAsync({ eventId, email: email.trim(), role });
      setEmail('');
      setRole('viewer');
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to invite collaborator. Check the email address.');
    }
  };

  const modalWidth = isMobile ? screenWidth - 32 : Math.min(420, screenWidth - 64);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { width: modalWidth }, getShadowStyle(0.15, 8, 4)]}>
          <View style={styles.header}>
            <Text style={styles.title}>Invite Collaborator</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={24} color={semantic.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="user@example.com"
            placeholderTextColor={semantic.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Collaborator email"
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {(['viewer', 'editor'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleButton, role === r && styles.roleButtonActive]}
                onPress={() => setRole(r)}
                accessibilityRole="button"
                accessibilityLabel={`Role ${r}`}
              >
                <Feather
                  name={r === 'editor' ? 'edit-3' : 'eye'}
                  size={16}
                  color={role === r ? colors.neutral[0] : colors.primary[500]}
                />
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            {role === 'viewer'
              ? 'Viewers can see event details but cannot make changes.'
              : 'Editors can modify checklist and timeline entries.'}
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, inviteMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={inviteMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send invitation"
          >
            <Text style={styles.submitText}>
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: semantic.surface,
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: semantic.textPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: semantic.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: semantic.textPrimary,
    backgroundColor: semantic.background,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  roleButtonActive: {
    backgroundColor: colors.primary[500],
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  roleTextActive: {
    color: colors.neutral[0],
  },
  hint: {
    fontSize: 12,
    color: semantic.textMuted,
    marginBottom: 16,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: colors.neutral[0],
    fontSize: 15,
    fontWeight: '600',
  },
});
