import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, Redirect } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';

export default function ProviderLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (user?.role !== 'provider') {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
