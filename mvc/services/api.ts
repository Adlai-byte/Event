import { Platform } from 'react-native';

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
export function getApiBaseUrl(): string {
	// Allow override via Expo public env (works in RN/Web)
	// Example: EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001
	const envBase = (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL as string | undefined;
	if (envBase && typeof envBase === 'string' && envBase.length > 0) {
		const cleaned = envBase.replace(/\/$/, '');
		console.log('🌐 Using API base URL from environment:', cleaned);
		return cleaned;
	}

	if (Platform.OS === 'android') {
		// Android emulator maps host machine localhost to 10.0.2.2
		// NOTE: This won't work on physical Android devices with Expo Go!
		const url = 'http://10.0.2.2:3001';
		console.log('🌐 Using Android emulator API URL:', url);
		return url;
	}

	// iOS simulator and web can use localhost
	// NOTE: This won't work on physical iOS devices with Expo Go!
	const url = 'http://localhost:3001';
	console.log('🌐 Using localhost API URL:', url);
	console.warn('⚠️  If you\'re using Expo Go on a physical device, set EXPO_PUBLIC_API_BASE_URL to your computer\'s IP address!');
	return url;
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














