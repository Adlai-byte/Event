import { NativeModules, Platform } from 'react-native';

/**
 * Get the API base URL for network requests
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_BASE_URL environment variable (highest priority)
 * 2. Platform-specific defaults
 *
 * IMPORTANT: When using Expo Go on a physical device, you MUST set EXPO_PUBLIC_API_BASE_URL
 * to your computer's IP address (e.g., http://192.168.1.100:3001)
 *
 * To find your IP address:
 * - Windows: ipconfig (look for IPv4 Address)
 * - Mac/Linux: ifconfig or ip addr
 */
let cachedBaseUrl: string | null = null;

function getDevServerHost(): string | null {
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (!scriptURL || typeof scriptURL !== 'string') {
      return null;
    }

    const url = new URL(scriptURL);
    const hostname = url.hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }
    return hostname;
  } catch (error) {
    console.warn('⚠️  Unable to detect dev server host automatically:', error);
    return null;
  }
}

export function getApiBaseUrl(): string {
  if (cachedBaseUrl) {
    return cachedBaseUrl ?? '';
  }

  // VPS API URL - used for both development and production
  // Direct VPS IP address (HTTP - may cause mixed content issues on HTTPS sites)
  const VPS_DIRECT_IP = 'http://72.62.64.59:3001';

  // Cloudflare Tunnel HTTPS URL (RECOMMENDED for production to avoid mixed content)
  // Note: Quick tunnel URLs may change if service restarts. For permanent URL, use named tunnel.
  const VPS_TUNNEL_URL =
    process.env.EXPO_PUBLIC_VPS_API_URL ||
    'https://amplifier-analysis-produces-carry.trycloudflare.com';

  // For production (Vercel/web), ALWAYS prefer HTTPS tunnel URL to avoid mixed content errors
  // For development, use direct IP (tunnel URLs are temporary and may expire)
  // In production, use tunnel URL if it's HTTPS (even if env var not set, use hardcoded fallback)
  const isWeb = (Platform.OS as string) === 'web';
  const VPS_API_URL =
    !__DEV__ && isWeb && VPS_TUNNEL_URL.startsWith('https://') ? VPS_TUNNEL_URL : VPS_DIRECT_IP;

  // Allow override via Expo public env (highest priority)
  // Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001
  const envBase = (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL as string | undefined;
  if (envBase && typeof envBase === 'string' && envBase.length > 0) {
    const cleaned = envBase.replace(/\/$/, '');
    console.log('🌐 Using API base URL from environment:', cleaned);
    cachedBaseUrl = cleaned;
    return cachedBaseUrl ?? '';
  }

  // Production mode (including APK builds): Always use VPS URL
  // BUT: If running on Android emulator, use 10.0.2.2 to access host machine's localhost
  if (!__DEV__) {
    // Check if we're on Android emulator (even in production builds)
    // Android emulator can access host machine's localhost via 10.0.2.2
    if (Platform.OS === 'android') {
      // Try to detect if we're on an emulator
      // For EAS builds running on emulator, allow override via env var or use VPS
      // If EXPO_PUBLIC_API_BASE_URL is set, use it (allows testing with local server)
      const _emulatorUrl = 'http://10.0.2.2:3001';
      // For now, use VPS for production Android builds
      // To test with local server on emulator, set EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001
      const productionUrl = isWeb ? VPS_API_URL : VPS_DIRECT_IP;
      console.log('🌐 [PRODUCTION ANDROID] Using VPS API base URL:', productionUrl);
      console.log(
        '🌐 [PRODUCTION ANDROID] Platform:',
        Platform.OS,
        'isWeb:',
        isWeb,
        '__DEV__:',
        __DEV__,
      );
      console.log(
        '🌐 [PRODUCTION ANDROID] Environment variable EXPO_PUBLIC_API_BASE_URL:',
        envBase || 'NOT SET',
      );
      console.log(
        '🌐 [PRODUCTION ANDROID] To use local server on emulator, set EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001',
      );
      cachedBaseUrl = productionUrl;
      return cachedBaseUrl ?? '';
    }

    // For production APK builds, always use direct VPS IP (not tunnel URL for mobile)
    const productionUrl = isWeb ? VPS_API_URL : VPS_DIRECT_IP;
    console.log('🌐 [PRODUCTION] Using VPS API base URL:', productionUrl);
    console.log('🌐 [PRODUCTION] Platform:', Platform.OS, 'isWeb:', isWeb, '__DEV__:', __DEV__);
    console.log(
      '🌐 [PRODUCTION] Environment variable EXPO_PUBLIC_API_BASE_URL:',
      envBase || 'NOT SET',
    );
    cachedBaseUrl = productionUrl;
    return cachedBaseUrl ?? '';
  }

  // Development mode: Try auto-detection first, fallback to VPS
  if (__DEV__) {
    const devHost = getDevServerHost();
    if (devHost && devHost !== 'localhost' && devHost !== '127.0.0.1') {
      const url = `http://${devHost}:3001`;
      console.log('🌐 Using API base URL from dev server host:', url);
      cachedBaseUrl = url;
      return cachedBaseUrl ?? '';
    }

    if (Platform.OS === 'android') {
      // Android emulator maps host machine localhost to 10.0.2.2
      // NOTE: This won't work on physical Android devices with Expo Go!
      const url = 'http://10.0.2.2:3001';
      console.log('🌐 Using Android emulator API URL:', url);
      cachedBaseUrl = url;
      return cachedBaseUrl ?? '';
    }

    // For web development, use localhost if available, otherwise fallback to VPS
    // Check if we can reach localhost first
    const localhostUrl = 'http://localhost:3001';
    console.log('🌐 Using localhost API URL for development:', localhostUrl);
    cachedBaseUrl = localhostUrl;
    return cachedBaseUrl ?? '';
  }

  // Fallback: use VPS URL
  console.log('🌐 Using VPS API base URL (fallback):', VPS_API_URL);
  cachedBaseUrl = VPS_API_URL;
  return cachedBaseUrl ?? '';
}

/**
 * Check if the API server is reachable
 */
export async function checkApiConnection(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      timeout: 5000,
    } as any);
    return response.ok;
  } catch (error) {
    console.error('❌ API connection check failed:', error);
    return false;
  }
}
