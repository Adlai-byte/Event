import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, TextInput, Platform } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import UserService, { AdminUserRow } from '../../services/UserService';
import { AppLayout } from '../../components/layout';
import { colors, semantic } from '../../theme';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface AdminUserProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const User: React.FC<AdminUserProps> = ({ user, onNavigate, onLogout }) => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editSuffix, setEditSuffix] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  useEffect(() => {
    // Prefer MySQL list if API is available; fallback to Firebase service
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${getApiBaseUrl()}/api/users`);
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled && data && data.ok && Array.isArray(data.rows)) {
            const mapped: AdminUserRow[] = data.rows
              .filter((r: any) => r.u_email !== 'admin@gmail.com')
              .map((r: any) => ({
                name: [r.u_fname, r.u_lname].filter(Boolean).join(' ').trim(),
                email: r.u_email,
                role: r.u_role ? r.u_role.charAt(0).toUpperCase() + r.u_role.slice(1) : 'User',
                status: (r.u_disabled && Number(r.u_disabled) === 1) ? 'Blocked' : 'Active',
              }));
            setRows(mapped);
            return;
          }
        }
      } catch {}
      // Fallback: Firebase subscription
      const unsubscribe = UserService.subscribeUsers((rows) => {
        const filtered = rows.filter(r => r.email !== 'admin@gmail.com');
        setRows(filtered);
      }, (err) => {
        console.error('Failed to subscribe to users:', err);
      });
      return () => unsubscribe();
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Filter rows based on search query
  const filteredRows = rows.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query) ||
      u.status.toLowerCase().includes(query)
    );
  });

  const handleEditUser = async (userEmail: string) => {
    try {
      // Fetch user details by email
      const resp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(userEmail)}`);
      if (!resp.ok) throw new Error('Failed to fetch user details');
      const data = await resp.json();
      if (!data.ok || !data.exists) throw new Error('User not found');

      // Also get the user ID from the full list
      const listResp = await fetch(`${getApiBaseUrl()}/api/users`);
      const listData = await listResp.json();
      if (!listResp.ok || !listData.ok) throw new Error('Failed to fetch user list');
      const match = listData.rows.find((x: any) => x.u_email === userEmail);
      if (!match) throw new Error('User ID not found');

      setEditingUserId(match.iduser);
      setEditFirstName(data.firstName || '');
      setEditMiddleName(data.middleName || '');
      setEditLastName(data.lastName || '');
      setEditSuffix(data.suffix || '');
      setEditEmail(data.email || '');
      setEditPassword('');
      setEditConfirmPassword('');
      setActiveTab('add'); // Switch to add tab to show edit form
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load user details');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;

    // Clear previous error message
    setErrorMessage('');

    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setErrorMessage('First name, last name, and email are required.');
      return;
    }
    if (editPassword && editPassword !== editConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/users/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editFirstName,
          middleName: editMiddleName,
          lastName: editLastName,
          suffix: editSuffix,
          email: editEmail,
          password: editPassword || undefined
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Failed to update user');

      // Reset edit form
      setEditingUserId(null);
      setEditFirstName('');
      setEditMiddleName('');
      setEditLastName('');
      setEditSuffix('');
      setEditEmail('');
      setEditPassword('');
      setEditConfirmPassword('');

      // Refresh user list
      const r = await fetch(`${getApiBaseUrl()}/api/users`);
      const j = await r.json();
      if (r.ok && j.ok) {
        const mapped = j.rows.filter((x: any) => x.u_email !== 'admin@gmail.com').map((x: any) => ({
          name: [x.u_fname, x.u_lname].filter(Boolean).join(' ').trim(),
          email: x.u_email,
          role: x.u_role ? x.u_role.charAt(0).toUpperCase() + x.u_role.slice(1) : 'User',
          status: (x.u_disabled && Number(x.u_disabled) === 1) ? 'Blocked' : 'Active'
        }));
        setRows(mapped);
      }

      // Switch to list view and show success message
      setActiveTab('list');
      setSuccessMessage('User updated successfully!');
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to update user. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditFirstName('');
    setEditMiddleName('');
    setEditLastName('');
    setEditSuffix('');
    setEditEmail('');
    setEditPassword('');
    setEditConfirmPassword('');
    setActiveTab('list');
  };

  return (
    <AppLayout
      role="admin"
      activeRoute="user"
      title="Users"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Users Management</Text>
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
                accessibilityRole="button"
                accessibilityLabel="View all users tab"
              >
                <Text style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}>View All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'add' && styles.tabButtonActive]}
                onPress={() => setActiveTab('add')}
                accessibilityRole="button"
                accessibilityLabel="Add user tab"
              >
                <Text style={[styles.tabButtonText, activeTab === 'add' && styles.tabButtonTextActive]}>Add User</Text>
              </TouchableOpacity>
            </View>

        <View style={styles.card}>
          {activeTab === 'add' && (
            <View>
              {errorMessage ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorMessageText}>{errorMessage}</Text>
                  <TouchableOpacity onPress={() => setErrorMessage('')} style={styles.errorCloseButton} accessibilityRole="button" accessibilityLabel="Dismiss error">
                    <Text style={styles.errorCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {editingUserId ? (
                <>
                  <Text style={styles.formTitle}>Edit User</Text>
                  <Text style={styles.formLabel}>First Name</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Enter your first name"
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    autoCapitalize="words"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Edit first name"
                  />
                  <Text style={styles.formLabel}>Middle Name (optional)</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Enter your middle name"
                    value={editMiddleName}
                    onChangeText={setEditMiddleName}
                    autoCapitalize="words"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Edit middle name"
                  />
                  <Text style={styles.formLabel}>Last Name</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Enter your last name"
                    value={editLastName}
                    onChangeText={setEditLastName}
                    autoCapitalize="words"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Edit last name"
                  />
                  <Text style={styles.formLabel}>Suffix (optional)</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Jr., Sr., III, etc."
                    value={editSuffix}
                    onChangeText={setEditSuffix}
                    autoCapitalize="characters"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Edit suffix"
                  />
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="you@example.com"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Edit email"
                  />
                  <Text style={styles.formLabel}>New Password (leave blank to keep current)</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.addInputFull, { flex: 1, borderWidth: 0, paddingRight: 8 }]}
                      placeholder="••••••••"
                      value={editPassword}
                      onChangeText={setEditPassword}
                      secureTextEntry={!showEditPassword}
                      placeholderTextColor={semantic.textMuted}
                      accessibilityLabel="New password"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowEditPassword(prev => !prev)} accessibilityRole="button" accessibilityLabel={showEditPassword ? 'Hide password' : 'Show password'}>
                      <Text style={styles.eyeText}>{showEditPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formLabel}>Confirm New Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.addInputFull, { flex: 1, borderWidth: 0, paddingRight: 8 }]}
                      placeholder="••••••••"
                      value={editConfirmPassword}
                      onChangeText={setEditConfirmPassword}
                      secureTextEntry={!showEditConfirm}
                      placeholderTextColor={semantic.textMuted}
                      accessibilityLabel="Confirm new password"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowEditConfirm(prev => !prev)} accessibilityRole="button" accessibilityLabel={showEditConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                      <Text style={styles.eyeText}>{showEditConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editButtonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} accessibilityRole="button" accessibilityLabel="Cancel edit">
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdateUser} accessibilityRole="button" accessibilityLabel="Update user">
                      <Text style={styles.updateButtonText}>Update User</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.formLabel}>First Name</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Enter your first name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="First name"
                  />
                  <Text style={styles.formLabel}>Middle Name (optional)</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Enter your middle name"
                    value={middleName}
                    onChangeText={setMiddleName}
                    autoCapitalize="words"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Middle name"
                  />
                  <Text style={styles.formLabel}>Last Name</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Enter your last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Last name"
                  />
                  <Text style={styles.formLabel}>Suffix (optional)</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="Jr., Sr., III, etc."
                    value={suffix}
                    onChangeText={setSuffix}
                    autoCapitalize="characters"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Suffix"
                  />
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.addInputFull}
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={semantic.textMuted}
                    accessibilityLabel="Email"
                  />
                  <Text style={styles.formLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.addInputFull, { flex: 1, borderWidth: 0, paddingRight: 8 }]}
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholderTextColor={semantic.textMuted}
                      accessibilityLabel="Password"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(prev => !prev)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                      <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formLabel}>Confirm Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.addInputFull, { flex: 1, borderWidth: 0, paddingRight: 8 }]}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                      placeholderTextColor={semantic.textMuted}
                      accessibilityLabel="Confirm password"
                    />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(prev => !prev)} accessibilityRole="button" accessibilityLabel={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
                      <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.addButtonLarge} accessibilityRole="button" accessibilityLabel="Add user" onPress={async () => {
                    // Clear previous error message
                    setErrorMessage('');

                    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
                      setErrorMessage('First name, last name, and email are required.');
                      return;
                    }
                    if (password !== confirmPassword) {
                      setErrorMessage('Passwords do not match.');
                      return;
                    }
                    try {
                      const resp = await fetch(`${getApiBaseUrl()}/api/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, middleName, lastName, suffix, email, password: password || undefined }) });
                      const data = await resp.json();
                      if (!resp.ok || !data.ok) throw new Error(data.error || 'Failed to add user');
                      setFirstName(''); setMiddleName(''); setLastName(''); setSuffix(''); setEmail(''); setPassword(''); setConfirmPassword('');
                      const r = await fetch(`${getApiBaseUrl()}/api/users`);
                      const j = await r.json();
                      if (r.ok && j.ok) {
                        const mapped = j.rows.filter((x: any) => x.u_email !== 'admin@gmail.com').map((x: any) => ({ name: [x.u_fname, x.u_lname].filter(Boolean).join(' ').trim(), email: x.u_email, role: x.u_role ? x.u_role.charAt(0).toUpperCase() + x.u_role.slice(1) : 'User', status: (x.u_disabled && Number(x.u_disabled) === 1) ? 'Blocked' : 'Active' }));
                        setRows(mapped);
                      }
                      // Switch back to list view and show success message
                      setActiveTab('list');
                      setSuccessMessage('User successfully added!');
                    } catch (e: any) {
                      setErrorMessage(e.message || 'Failed to add user. Please try again.');
                    }
                  }}>
                    <Text style={styles.addButtonText}>Add user</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          {activeTab === 'list' && (
            <>
              {successMessage ? (
                <View style={styles.successMessage}>
                  <Text style={styles.successMessageText}>{successMessage}</Text>
                  <TouchableOpacity onPress={() => setSuccessMessage('')} style={styles.successCloseButton} accessibilityRole="button" accessibilityLabel="Dismiss success message">
                    <Text style={styles.successCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Search Container */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, email, role, or status..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={semantic.textMuted}
                  accessibilityLabel="Search users"
                />
              </View>

              {isMobile ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScrollView}>
                  <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                <Text style={[styles.th, { flex: 2 }]}>Email</Text>
                <Text style={[styles.th, { flex: 1 }]}>Role</Text>
                <Text style={[styles.th, { flex: 1 }]}>Status</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Actions</Text>
              </View>
              {filteredRows.map((u, i) => (
                <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.td, { flex: 2 }]}>{u.name}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{u.email}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{u.role}</Text>
                      <View style={[styles.tdStatus, { flex: 1 }]}>
                        <View style={[styles.statusBadge, { backgroundColor: u.status === 'Active' ? colors.success[50] : colors.error[50] }]}>
                          <Text style={[styles.statusText, { color: u.status === 'Active' ? '#16A34A' : colors.error[600] }]}>{u.status}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEditUser(u.email)} accessibilityRole="button" accessibilityLabel={`Edit ${u.name}`}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, u.status === 'Active' ? styles.blockButton : styles.unblockButton]} accessibilityRole="button" accessibilityLabel={u.status === 'Active' ? `Block ${u.name}` : `Unblock ${u.name}`} onPress={async () => {
                      try {
                        const r = await fetch(`${getApiBaseUrl()}/api/users`);
                        const j = await r.json();
                        if (!r.ok || !j.ok) throw new Error('Failed to refresh list');
                        const match = j.rows.find((x: any) => x.u_email === u.email);
                        if (!match) throw new Error('User not found');
                        const resp = await fetch(`${getApiBaseUrl()}/api/users/${match.iduser}/block`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocked: u.status === 'Active' }) });
                        const data = await resp.json();
                        if (!resp.ok || !data.ok) throw new Error(data.error || 'Failed to update');
                        const r2 = await fetch(`${getApiBaseUrl()}/api/users`);
                        const j2 = await r2.json();
                        if (r2.ok && j2.ok) {
                          const mapped2 = j2.rows.filter((x: any) => x.u_email !== 'admin@gmail.com').map((x: any) => ({ name: [x.u_fname, x.u_lname].filter(Boolean).join(' ').trim(), email: x.u_email, role: 'User', status: (x.u_disabled && Number(x.u_disabled) === 1) ? 'Blocked' : 'Active' }));
                          setRows(mapped2);
                        }
                      } catch (e: any) { Alert.alert('Update User', e.message); }
                    }}>
                      <Text style={styles.actionButtonText}>{u.status === 'Active' ? 'Block' : 'Unblock'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                    <Text style={[styles.th, { flex: 2 }]}>Email</Text>
                    <Text style={[styles.th, { flex: 1 }]}>Role</Text>
                    <Text style={[styles.th, { flex: 1 }]}>Status</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Actions</Text>
                  </View>
                  {filteredRows.map((u, i) => (
                    <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                      <Text style={[styles.td, { flex: 2 }]}>{u.name}</Text>
                      <Text style={[styles.td, { flex: 2 }]}>{u.email}</Text>
                      <Text style={[styles.td, { flex: 1 }]}>{u.role}</Text>
                      <View style={[styles.tdStatus, { flex: 1 }]}>
                        <View style={[styles.statusBadge, { backgroundColor: u.status === 'Active' ? colors.success[50] : colors.error[50] }]}>
                          <Text style={[styles.statusText, { color: u.status === 'Active' ? '#16A34A' : colors.error[600] }]}>{u.status}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                        <TouchableOpacity style={styles.editButton} onPress={() => handleEditUser(u.email)}>
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, u.status === 'Active' ? styles.blockButton : styles.unblockButton]} accessibilityRole="button" accessibilityLabel={u.status === 'Active' ? `Block ${u.name}` : `Unblock ${u.name}`} onPress={async () => {
                          try {
                            const r = await fetch(`${getApiBaseUrl()}/api/users`);
                            const j = await r.json();
                            if (!r.ok || !j.ok) throw new Error('Failed to refresh list');
                            const match = j.rows.find((x: any) => x.u_email === u.email);
                            if (!match) throw new Error('User not found');
                            const resp = await fetch(`${getApiBaseUrl()}/api/users/${match.iduser}/block`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocked: u.status === 'Active' }) });
                            const data = await resp.json();
                            if (!resp.ok || !data.ok) throw new Error(data.error || 'Failed to update');
                            const r2 = await fetch(`${getApiBaseUrl()}/api/users`);
                            const j2 = await r2.json();
                            if (r2.ok && j2.ok) {
                              const mapped2 = j2.rows.filter((x: any) => x.u_email !== 'admin@gmail.com').map((x: any) => ({ name: [x.u_fname, x.u_lname].filter(Boolean).join(' ').trim(), email: x.u_email, role: 'User', status: (x.u_disabled && Number(x.u_disabled) === 1) ? 'Blocked' : 'Active' }));
                              setRows(mapped2);
                            }
                          } catch (e: any) { Alert.alert('Update User', e.message); }
                        }}>
                          <Text style={styles.actionButtonText}>{u.status === 'Active' ? 'Block' : 'Unblock'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: isMobile ? 12 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  header: {
    marginBottom: isMobile ? 16 : 24,
  },
  title: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: semantic.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: isMobile ? 12 : 20,
    backgroundColor: semantic.surface,
    flexWrap: 'wrap',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: isMobile ? undefined : 0,
    minWidth: isMobile ? (screenWidth - 48) / 2 : 120,
    paddingVertical: isMobile ? 8 : 8,
    paddingHorizontal: isMobile ? 12 : 16,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: semantic.primary,
    elevation: 2,
    shadowColor: semantic.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: isMobile ? 12 : 13,
    color: semantic.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: semantic.surface,
    fontWeight: '700',
  },
  formLabel: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '600',
    color: semantic.textPrimary,
    marginTop: isMobile ? 12 : 16,
    marginBottom: isMobile ? 6 : 8,
  },
  card: {
    backgroundColor: semantic.surface,
    borderRadius: 12,
    padding: isMobile ? 16 : 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: semantic.background,
  },
  searchContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: semantic.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: semantic.textPrimary,
    borderWidth: 1,
    borderColor: semantic.border,
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none' as any,
      cursor: 'text' as any,
    } as any : {}),
  },
  tableScrollView: {
    marginTop: 8,
  },
  tableContainer: {
    backgroundColor: semantic.surface,
    borderRadius: 12,
    overflow: 'hidden',
    ...(isMobile && { minWidth: 700 }),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: semantic.background,
    paddingVertical: isMobile ? 12 : 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: semantic.border,
  },
  th: {
    color: semantic.textSecondary,
    fontSize: isMobile ? 11 : 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: isMobile ? 14 : 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: semantic.background,
    alignItems: 'center',
  },
  rowAlt: {
    backgroundColor: semantic.background,
  },
  td: {
    color: semantic.textPrimary,
    fontSize: isMobile ? 13 : 14,
    fontWeight: '500',
  },
  tdStatus: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: isMobile ? 11 : 12,
    fontWeight: '600',
  },
  addInputFull: {
    borderWidth: 1.5,
    borderColor: semantic.border,
    borderRadius: 8,
    paddingVertical: isMobile ? 12 : 14,
    paddingHorizontal: isMobile ? 14 : 16,
    backgroundColor: semantic.surface,
    fontSize: isMobile ? 14 : 15,
    color: semantic.textPrimary,
  },
  addButtonText: {
    color: semantic.surface,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  addButtonLarge: {
    backgroundColor: semantic.primary,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 150,
    elevation: 2,
    shadowColor: semantic.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: semantic.border,
    borderRadius: 8,
    backgroundColor: semantic.surface,
    paddingRight: 8,
  },
  eyeButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  eyeText: {
    fontSize: 18,
    color: semantic.textSecondary,
  },
  actionButton: {
    paddingVertical: isMobile ? 8 : 8,
    paddingHorizontal: isMobile ? 14 : 16,
    borderRadius: 6,
    minWidth: isMobile ? 70 : 80,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    color: semantic.surface,
    fontWeight: '600',
    fontSize: isMobile ? 11 : 12,
  },
  blockButton: {
    backgroundColor: colors.error[600],
  },
  unblockButton: {
    backgroundColor: '#16A34A',
  },
  editButton: {
    paddingVertical: isMobile ? 8 : 8,
    paddingHorizontal: isMobile ? 14 : 16,
    borderRadius: 6,
    backgroundColor: semantic.primary,
    minWidth: isMobile ? 70 : 80,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: semantic.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  editButtonText: {
    color: semantic.surface,
    fontWeight: '600',
    fontSize: isMobile ? 11 : 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: semantic.textPrimary,
    marginBottom: 20,
    marginTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: semantic.background,
    borderWidth: 1,
    borderColor: semantic.border,
  },
  cancelButtonText: {
    color: semantic.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  updateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: semantic.primary,
  },
  updateButtonText: {
    color: semantic.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  successMessage: {
    backgroundColor: semantic.success,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successMessageText: {
    color: semantic.surface,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  successCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  successCloseText: {
    color: semantic.surface,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  errorMessage: {
    backgroundColor: semantic.error,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorMessageText: {
    color: semantic.surface,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorCloseText: {
    color: semantic.surface,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});

export default User;
