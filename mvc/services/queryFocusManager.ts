import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

export function setupReactNativeFocusManager() {
  if (Platform.OS === 'web') return () => {};

  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });

  return () => subscription.remove();
}
