import { Platform, StyleSheet } from 'react-native';

/**
 * Get cross-platform shadow styles
 * Returns boxShadow for web and shadow properties for native
 * 
 * Note: On web, we apply shadow styles inline to avoid StyleSheet.create warnings
 */
export const getShadowStyle = (
  opacity: number = 0.1,
  radius: number = 4,
  height: number = 2,
  color: string = '#000'
) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${height}px ${radius * 2}px rgba(0, 0, 0, ${opacity})`,
    } as const;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: radius + 1,
  } as const;
};

/**
 * Create styles with shadow support that avoids deprecation warnings
 * Use this instead of StyleSheet.create when you need shadows
 */
export const createStylesWithShadow = <T extends Record<string, any>>(
  styles: T
): T => {
  if (Platform.OS === 'web') {
    // On web, we need to process styles to replace shadow properties with boxShadow
    const processedStyles: any = {};
    for (const [key, style] of Object.entries(styles)) {
      if (style && typeof style === 'object' && !Array.isArray(style)) {
        const processedStyle: any = { ...style };
        // Remove shadow properties and add boxShadow if they exist
        if ('shadowColor' in processedStyle || 'shadowOffset' in processedStyle) {
          const opacity = processedStyle.shadowOpacity || 0.1;
          const radius = processedStyle.shadowRadius || 4;
          const height = processedStyle.shadowOffset?.height || 2;
          processedStyle.boxShadow = `0 ${height}px ${radius * 2}px rgba(0, 0, 0, ${opacity})`;
          delete processedStyle.shadowColor;
          delete processedStyle.shadowOffset;
          delete processedStyle.shadowOpacity;
          delete processedStyle.shadowRadius;
          delete processedStyle.elevation;
        }
        processedStyles[key] = processedStyle;
      } else {
        processedStyles[key] = style;
      }
    }
    return processedStyles as T;
  }
  // On native, use StyleSheet.create normally
  return StyleSheet.create(styles);
};

