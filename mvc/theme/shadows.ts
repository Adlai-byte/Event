// mvc/theme/shadows.ts
import { Platform, ViewStyle } from 'react-native';

type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl';

const shadowConfigs: Record<ShadowLevel, { opacity: number; radius: number; height: number }> = {
  sm: { opacity: 0.05, radius: 2, height: 1 },
  md: { opacity: 0.08, radius: 4, height: 2 },
  lg: { opacity: 0.1, radius: 8, height: 4 },
  xl: { opacity: 0.15, radius: 16, height: 8 },
};

export function shadow(level: ShadowLevel): ViewStyle {
  const { opacity, radius, height } = shadowConfigs[level];

  if (Platform.OS === 'web') {
    return {
      // @ts-expect-error - web-only property
      boxShadow: `0 ${height}px ${radius * 2}px rgba(0, 0, 0, ${opacity})`,
    };
  }

  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: radius + 1,
  };
}
