import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, TextInput } from 'react-native';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import UserService, { AdminUserRow } from '../../services/UserService';

const { width: screenWidth } = Dimensions.get('window');

interface AdminUserProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const User: React.FC<AdminUserProps> = ({ user, onNavigate, onLogout }) => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
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

  const SidebarItem = ({ icon, label, route }: { icon: string; label: string; route: string }) => (
    <TouchableOpacity style={styles.sidebarItem} onPress={() => onNavigate?.(route)}>
      <Text style={styles.sidebarIcon}>{icon}</Text>
      <Text style={styles.sidebarLabel}>{label}</Text>
    </TouchableOpacity>
  );

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
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      Alert.alert('Update User', 'First name, last name, and email are required.');
      return;
    }
    if (editPassword && editPassword !== editConfirmPassword) {
      Alert.alert('Update User', 'Passwords do not match.');
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
      
      setActiveTab('list');
      Alert.alert('Success', 'User updated successfully');
    } catch (e: any) {
      Alert.alert('Update User', e.message || 'Failed to update user');
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
    <View style={styles.layout}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.getInitials() || 'AD'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.getFullName() || 'Admin'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.sidebarNav}>
          <SidebarItem icon="🏠" label="Dashboard" route="dashboard" />
          <SidebarItem icon="👤" label="Users" route="user" />
          <SidebarItem icon="🚀" label="Provider Applications" route="providerApplications" />
          <SidebarItem icon="📊" label="Analytics" route="analytics" />
          <SidebarItem icon="⚙️" label="Settings" route="settings" />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Users Management</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}>View All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'add' && styles.tabButtonActive]}
                onPress={() => setActiveTab('add')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'add' && styles.tabButtonTextActive]}>Add User</Text>
              </TouchableOpacity>
            </View>
          </View>
          {activeTab === 'add' && (
            <View>
              {editingUserId ? (
                <>
                  <Text style={styles.formTitle}>Edit User</Text>
                  <Text style={styles.formLabel}>First Name</Text>
                  <TextInput style={styles.addInputFull} placeholder="Enter your first name" value={editFirstName} onChangeText={setEditFirstName} autoCapitalize="words" />
                  <Text style={styles.formLabel}>Middle Name (optional)</Text>
                  <TextInput style={styles.addInputFull} placeholder="Enter your middle name" value={editMiddleName} onChangeText={setEditMiddleName} autoCapitalize="words" />
                  <Text style={styles.formLabel}>Last Name</Text>
                  <TextInput style={styles.addInputFull} placeholder="Enter your last name" value={editLastName} onChangeText={setEditLastName} autoCapitalize="words" />
                  <Text style={styles.formLabel}>Suffix (optional)</Text>
                  <TextInput style={styles.addInputFull} placeholder="Jr., Sr., III, etc." value={editSuffix} onChangeText={setEditSuffix} autoCapitalize="characters" />
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput style={styles.addInputFull} placeholder="you@example.com" value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" keyboardType="email-address" />
                  <Text style={styles.formLabel}>New Password (leave blank to keep current)</Text>
                  <View style={styles.passwordRow}>
                    <TextInput style={[styles.addInputFull, { flex: 1 }]} placeholder="••••••••" value={editPassword} onChangeText={setEditPassword} secureTextEntry={!showEditPassword} />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowEditPassword(prev => !prev)}>
                      <Text style={styles.eyeText}>{showEditPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formLabel}>Confirm New Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput style={[styles.addInputFull, { flex: 1 }]} placeholder="••••••••" value={editConfirmPassword} onChangeText={setEditConfirmPassword} secureTextEntry={!showEditConfirm} />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowEditConfirm(prev => !prev)}>
                      <Text style={styles.eyeText}>{showEditConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.editButtonRow}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdateUser}>
                      <Text style={styles.updateButtonText}>Update User</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.formLabel}>First Name</Text>
                  <TextInput style={styles.addInputFull} placeholder="Enter your first name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                  <Text style={styles.formLabel}>Middle Name (optional)</Text>
                  <TextInput style={styles.addInputFull} placeholder="Enter your middle name" value={middleName} onChangeText={setMiddleName} autoCapitalize="words" />
                  <Text style={styles.formLabel}>Last Name</Text>
                  <TextInput style={styles.addInputFull} placeholder="Enter your last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                  <Text style={styles.formLabel}>Suffix (optional)</Text>
                  <TextInput style={styles.addInputFull} placeholder="Jr., Sr., III, etc." value={suffix} onChangeText={setSuffix} autoCapitalize="characters" />
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput style={styles.addInputFull} placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  <Text style={styles.formLabel}>Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput style={[styles.addInputFull, { flex: 1 }]} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(prev => !prev)}>
                      <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.formLabel}>Confirm Password</Text>
                  <View style={styles.passwordRow}>
                    <TextInput style={[styles.addInputFull, { flex: 1 }]} placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} />
                    <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirm(prev => !prev)}>
                      <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.addButtonLarge} onPress={async () => {
                    if (!firstName.trim() || !lastName.trim() || !email.trim()) { Alert.alert('Add User', 'First name, last name, and email are required.'); return; }
                    if (password !== confirmPassword) { Alert.alert('Add User', 'Passwords do not match.'); return; }
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
                      Alert.alert('Success', 'User added');
                    } catch (e: any) { Alert.alert('Add User', e.message); }
                  }}>
                    <Text style={styles.addButtonText}>Add user</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          {activeTab === 'list' && (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>Name</Text>
                <Text style={[styles.th, { flex: 2 }]}>Email</Text>
                <Text style={[styles.th, { flex: 1 }]}>Role</Text>
                <Text style={[styles.th, { flex: 1 }]}>Status</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Actions</Text>
              </View>
              {rows.map((u, i) => (
                <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
                  <Text style={[styles.td, { flex: 2 }]}>{u.name}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{u.email}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{u.role}</Text>
                  <Text style={[styles.tdStatus, { flex: 1, color: u.status === 'Active' ? '#16A34A' : '#DC2626' }]}>{u.status}</Text>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                    <TouchableOpacity style={styles.editButton} onPress={() => handleEditUser(u.email)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, u.status === 'Active' ? styles.blockButton : styles.unblockButton]} onPress={async () => {
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
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const sidebarWidth = Math.min(220, screenWidth * 0.25);

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: 20,
  },
  // Sidebar styles (mirrors admin Dashboard)
  sidebar: {
    width: sidebarWidth,
    backgroundColor: '#102A43',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1F3B57',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  profileEmail: {
    color: '#9FB3C8',
    fontSize: 12,
    marginTop: 4,
  },
  sidebarNav: {
    marginTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  sidebarIcon: {
    width: 26,
    fontSize: 16,
    color: '#fff',
  },
  sidebarLabel: {
    color: '#DFE7EF',
    fontSize: 14,
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  logoutButton: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1F3B57',
  },
  logoutIcon: {
    width: 26,
    fontSize: 16,
    color: '#FEE2E2',
  },
  logoutText: {
    color: '#FEE2E2',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#4a55e1',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    marginTop: 8,
  },
  th: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  rowAlt: {
    backgroundColor: '#F8FAFC',
  },
  td: {
    color: '#1E293B',
    fontSize: 13,
  },
  tdStatus: {
    color: '#16A34A',
    fontSize: 13,
    textAlign: 'right',
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    backgroundColor: '#F8FAFC',
  },
  addInputFull: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  addButton: {
    backgroundColor: '#4a55e1',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  addButtonLarge: {
    backgroundColor: '#4a55e1',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    width: '8%',
    alignSelf: 'center',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  eyeText: {
    fontSize: 16,
    color: '#666',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  blockButton: {
    backgroundColor: '#DC2626',
  },
  unblockButton: {
    backgroundColor: '#16A34A',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#4a55e1',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },
  updateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#4a55e1',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default User;


