import { useWindowDimensions, Platform } from 'react-native';

export function useBreakpoints() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isMobile = screenWidth < 768 || Platform.OS !== 'web';
  const isMobileWeb = Platform.OS === 'web' && screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const isDesktop = screenWidth >= 1024;
  const isLargeDesktop = screenWidth >= 1440;
  const isLandscape = screenWidth > screenHeight;

  return {
    screenWidth,
    screenHeight,
    isMobile,
    isMobileWeb,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isLandscape,
  };
}
