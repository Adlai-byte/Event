import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { SkeletonCard } from '../../components/ui';
import { semantic } from '../../theme';
import { createStyles } from './CancellationPoliciesView.styles';
import {
  useCancellationPolicies,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useDeletePolicyMutation,
  CancellationPolicy,
  CancellationRule,
} from '../../hooks/useCancellationPolicies';

interface CancellationPoliciesViewProps {
  user?: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

const DEFAULT_RULES: CancellationRule[] = [
  { days_before: 30, refund_percent: 100 },
  { days_before: 7, refund_percent: 50 },
  { days_before: 0, refund_percent: 0 },
];

export const CancellationPoliciesView: React.FC<CancellationPoliciesViewProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingPolicy, setEditingPolicy] = useState<CancellationPolicy | null>(null);
  const [formName, setFormName] = useState('');
  const [formDepositPercent, setFormDepositPercent] = useState('50');
  const [formRules, setFormRules] = useState<CancellationRule[]>(DEFAULT_RULES);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: policiesData, isLoading } = useCancellationPolicies();
  const createMutation = useCreatePolicyMutation();
  const updateMutation = useUpdatePolicyMutation();
  const deleteMutation = useDeletePolicyMutation();

  const policies = policiesData?.rows ?? [];

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDepositPercent('50');
    setFormRules([...DEFAULT_RULES]);
    setEditingPolicy(null);
    setSuccessMsg('');
    setErrorMsg('');
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setMode('create');
  }, [resetForm]);

  const handleEdit = useCallback((policy: CancellationPolicy) => {
    setEditingPolicy(policy);
    setFormName(policy.name);
    setFormDepositPercent(String(policy.depositPercent));
    setFormRules(policy.rules && policy.rules.length > 0 ? [...policy.rules] : [...DEFAULT_RULES]);
    setSuccessMsg('');
    setErrorMsg('');
    setMode('edit');
  }, []);

  const handleDelete = useCallback(
    (policy: CancellationPolicy) => {
      Alert.alert(
        'Delete Policy',
        `Are you sure you want to delete "${policy.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(policy.id, {
                onSuccess: () => {
                  setSuccessMsg('Policy deleted successfully.');
                  setTimeout(() => setSuccessMsg(''), 3000);
                },
                onError: (err: any) => {
                  setErrorMsg(err?.message || 'Failed to delete policy.');
                  setTimeout(() => setErrorMsg(''), 4000);
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation],
  );

  const handleCancel = useCallback(() => {
    resetForm();
    setMode('list');
  }, [resetForm]);

  const handleSave = useCallback(() => {
    if (!formName.trim()) {
      setErrorMsg('Policy name is required.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const deposit = parseInt(formDepositPercent, 10);
    if (isNaN(deposit) || deposit < 0 || deposit > 100) {
      setErrorMsg('Deposit must be between 0 and 100.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const validRules = formRules.filter((r) => !isNaN(r.days_before) && !isNaN(r.refund_percent));
    if (validRules.length === 0) {
      setErrorMsg('At least one rule is required.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    // Sort rules by days_before descending for consistency
    const sortedRules = [...validRules].sort((a, b) => b.days_before - a.days_before);

    const payload = {
      name: formName.trim(),
      depositPercent: deposit,
      rules: sortedRules,
    };

    if (mode === 'edit' && editingPolicy) {
      updateMutation.mutate(
        { id: editingPolicy.id, ...payload },
        {
          onSuccess: () => {
            setSuccessMsg('Policy updated successfully.');
            setTimeout(() => {
              setSuccessMsg('');
              resetForm();
              setMode('list');
            }, 1500);
          },
          onError: (err: any) => {
            setErrorMsg(err?.message || 'Failed to update policy.');
            setTimeout(() => setErrorMsg(''), 4000);
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setSuccessMsg('Policy created successfully.');
          setTimeout(() => {
            setSuccessMsg('');
            resetForm();
            setMode('list');
          }, 1500);
        },
        onError: (err: any) => {
          setErrorMsg(err?.message || 'Failed to create policy.');
          setTimeout(() => setErrorMsg(''), 4000);
        },
      });
    }
  }, [
    formName,
    formDepositPercent,
    formRules,
    mode,
    editingPolicy,
    createMutation,
    updateMutation,
    resetForm,
  ]);

  const handleAddRule = useCallback(() => {
    setFormRules((prev) => [...prev, { days_before: 0, refund_percent: 0 }]);
  }, []);

  const handleRemoveRule = useCallback((index: number) => {
    setFormRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRuleChange = useCallback(
    (index: number, field: 'days_before' | 'refund_percent', value: string) => {
      setFormRules((prev) => {
        const updated = [...prev];
        const num = parseInt(value, 10);
        updated[index] = {
          ...updated[index],
          [field]: isNaN(num)
            ? 0
            : Math.max(0, field === 'refund_percent' ? Math.min(num, 100) : num),
        };
        return updated;
      });
    },
    [],
  );

  const getRefundStyle = (percent: number) => {
    if (percent >= 75) return styles.ruleTextHighlight;
    if (percent >= 25) return styles.ruleTextWarning;
    return styles.ruleTextDanger;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const renderList = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Cancellation Policies</Text>
          <Text style={styles.headerSubtitle}>
            Manage deposit and refund rules for your services
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreate}
          accessibilityRole="button"
          accessibilityLabel="Create new cancellation policy"
        >
          <Feather name="plus" size={16} color={semantic.surface} />
          <Text style={styles.createButtonText}>Create Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {successMsg ? (
        <View style={[styles.messageContainer, styles.successMessage]}>
          <Text style={[styles.messageText, styles.successMessageText]}>{successMsg}</Text>
        </View>
      ) : null}
      {errorMsg ? (
        <View style={[styles.messageContainer, styles.errorMessage]}>
          <Text style={[styles.messageText, styles.errorMessageText]}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Loading */}
      {isLoading ? (
        <View>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : policies.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Feather name="shield" size={48} color={semantic.textMuted} />
          </View>
          <Text style={styles.emptyStateText}>
            No policies yet. Create one to set deposit and refund rules for your services.
          </Text>
        </View>
      ) : (
        /* Policy cards */
        policies.map((policy) => (
          <View key={policy.id} style={styles.policyCard}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{policy.name}</Text>
                <View style={styles.depositBadge}>
                  <Text style={styles.depositBadgeText}>{policy.depositPercent}% deposit</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEdit(policy)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit policy ${policy.name}`}
                >
                  <Feather name="edit-2" size={14} color={semantic.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(policy)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete policy ${policy.name}`}
                >
                  <Feather name="trash-2" size={14} color={semantic.error} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rules table */}
            {policy.rules && policy.rules.length > 0 ? (
              <View style={styles.rulesTable}>
                <View style={styles.rulesHeaderRow}>
                  <View style={styles.ruleColDays}>
                    <Text style={styles.rulesHeaderText}>Days Before Event</Text>
                  </View>
                  <View style={styles.ruleColRefund}>
                    <Text style={styles.rulesHeaderText}>Refund %</Text>
                  </View>
                </View>
                {policy.rules.map((rule, idx) => (
                  <View
                    key={idx}
                    style={[styles.ruleRow, idx === policy.rules.length - 1 && styles.ruleRowLast]}
                  >
                    <View style={styles.ruleColDays}>
                      <Text style={styles.ruleText}>
                        {rule.days_before === 0
                          ? 'Day of event'
                          : rule.days_before === 1
                            ? '1 day before'
                            : `${rule.days_before} days before`}
                      </Text>
                    </View>
                    <View style={styles.ruleColRefund}>
                      <Text style={[styles.ruleText, getRefundStyle(rule.refund_percent)]}>
                        {rule.refund_percent}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
    </>
  );

  const renderForm = () => (
    <>
      {/* Back / Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            {mode === 'edit' ? 'Edit Policy' : 'Create Policy'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {mode === 'edit'
              ? 'Update the name, deposit, and refund rules'
              : 'Set up deposit percentage and refund rules'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      {successMsg ? (
        <View style={[styles.messageContainer, styles.successMessage]}>
          <Text style={[styles.messageText, styles.successMessageText]}>{successMsg}</Text>
        </View>
      ) : null}
      {errorMsg ? (
        <View style={[styles.messageContainer, styles.errorMessage]}>
          <Text style={[styles.messageText, styles.errorMessageText]}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {mode === 'edit' ? 'Edit Cancellation Policy' : 'New Cancellation Policy'}
        </Text>

        {/* Name field */}
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Policy Name</Text>
          <TextInput
            style={styles.formInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g., Standard, Flexible, Strict"
            placeholderTextColor={semantic.textMuted}
            accessibilityLabel="Policy name"
          />
        </View>

        {/* Deposit percent */}
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Deposit Percentage</Text>
          <TextInput
            style={styles.formInput}
            value={formDepositPercent}
            onChangeText={(val) => {
              const cleaned = val.replace(/[^0-9]/g, '');
              const num = parseInt(cleaned, 10);
              if (cleaned === '') {
                setFormDepositPercent('');
              } else if (!isNaN(num) && num <= 100) {
                setFormDepositPercent(String(num));
              }
            }}
            keyboardType="numeric"
            placeholder="50"
            placeholderTextColor={semantic.textMuted}
            accessibilityLabel="Deposit percentage"
          />
          <Text style={styles.formHint}>
            The percentage of total price required as deposit at booking (0-100)
          </Text>
        </View>

        {/* Rules editor */}
        <View style={styles.rulesEditorSection}>
          <View style={styles.rulesEditorHeader}>
            <Text style={styles.formLabel}>Refund Rules</Text>
          </View>

          {formRules.map((rule, index) => (
            <View key={index} style={styles.ruleEditorRow}>
              <View style={styles.ruleEditorFieldGroup}>
                <Text style={styles.ruleEditorLabel}>Days before</Text>
                <TextInput
                  style={styles.ruleEditorInput}
                  value={String(rule.days_before)}
                  onChangeText={(val) => handleRuleChange(index, 'days_before', val)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={semantic.textMuted}
                  accessibilityLabel={`Rule ${index + 1} days before event`}
                />
              </View>
              <View style={styles.ruleEditorFieldGroup}>
                <Text style={styles.ruleEditorLabel}>Refund %</Text>
                <TextInput
                  style={styles.ruleEditorInput}
                  value={String(rule.refund_percent)}
                  onChangeText={(val) => handleRuleChange(index, 'refund_percent', val)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={semantic.textMuted}
                  accessibilityLabel={`Rule ${index + 1} refund percentage`}
                />
              </View>
              {formRules.length > 1 && (
                <TouchableOpacity
                  style={styles.removeRuleButton}
                  onPress={() => handleRemoveRule(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove rule ${index + 1}`}
                >
                  <Feather name="x" size={16} color={semantic.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.addRuleButton}
            onPress={handleAddRule}
            accessibilityRole="button"
            accessibilityLabel="Add refund rule"
          >
            <Feather name="plus" size={14} color={semantic.primary} />
            <Text style={styles.addRuleButtonText}>Add Rule</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={mode === 'edit' ? 'Update policy' : 'Save policy'}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={semantic.surface} />
            ) : (
              <>
                <Feather name="check" size={16} color={semantic.surface} />
                <Text style={styles.saveButtonText}>{mode === 'edit' ? 'Update' : 'Save'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <AppLayout
      role="provider"
      activeRoute="cancellation-policies"
      title="Cancellation Policies"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
        {mode === 'list' ? renderList() : renderForm()}
      </ScrollView>
    </AppLayout>
  );
};

export default CancellationPoliciesView;
