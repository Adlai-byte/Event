import { Platform } from 'react-native';

/**
 * Generates the HTML string for the Leaflet map WebView used in the
 * service form (mobile platforms). On web the map is rendered natively
 * via the Leaflet JS library loaded into the DOM.
 */
export function generateMapHTML(initialLat: number, initialLng: number): string {
  const isWeb = Platform.OS === 'web';

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
            #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map('map').setView([${initialLat}, ${initialLng}], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '\u00a9 OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            let marker = L.marker([${initialLat}, ${initialLng}], {
              draggable: true
            }).addTo(map);

            const sendMessage = (data) => {
              const message = JSON.stringify(data);
              ${isWeb ? `
                // For web, use window.postMessage to communicate with parent
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage(message, '*');
                } else {
                  // Fallback for same-origin iframe
                  window.postMessage(message, '*');
                }
              ` : `
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(message);
                }
              `}
            };

            const updateLocation = async (lat, lng) => {
              try {
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

                const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&zoom=18&addressdetails=1\`, {
                  headers: {
                    'User-Agent': 'EventApp/1.0',
                    'Accept-Language': 'en'
                  }
                });

                if (!response.ok) {
                  throw new Error(\`HTTP error! status: \${response.status}\`);
                }

                const data = await response.json();
                let address = data.display_name || '';

                // If display_name is empty, try to construct from address components
                if (!address && data.address) {
                  const addr = data.address;
                  const parts = [
                    addr.road,
                    addr.house_number,
                    addr.neighbourhood || addr.suburb,
                    addr.city || addr.town || addr.village,
                    addr.state,
                    addr.country
                  ].filter(Boolean);
                  address = parts.join(', ');
                }

                console.log('WebView reverse geocoding result:', { lat, lng, address });

                if (address && address.trim()) {
                  sendMessage({
                    type: 'location-selected',
                    lat: lat,
                    lng: lng,
                    address: address
                  });
                } else {
                  // Try one more time with different zoom level
                  try {
                    const retryResponse = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&zoom=16&addressdetails=1\`, {
                      headers: {
                        'User-Agent': 'EventApp/1.0',
                        'Accept-Language': 'en'
                      }
                    });
                    const retryData = await retryResponse.json();
                    const retryAddress = retryData.display_name || '';

                    if (retryAddress && retryAddress.trim()) {
                      sendMessage({
                        type: 'location-selected',
                        lat: lat,
                        lng: lng,
                        address: retryAddress
                      });
                    } else if (retryData.address) {
                      // Try constructing from retry data
                      const addr = retryData.address;
                      const parts = [
                        addr.road,
                        addr.house_number,
                        addr.neighbourhood || addr.suburb,
                        addr.city || addr.town || addr.village,
                        addr.state,
                        addr.country
                      ].filter(Boolean);
                      const constructedAddress = parts.join(', ');
                      if (constructedAddress) {
                        sendMessage({
                          type: 'location-selected',
                          lat: lat,
                          lng: lng,
                          address: constructedAddress
                        });
                      } else {
                        sendMessage({
                          type: 'location-selected',
                          lat: lat,
                          lng: lng,
                          address: ''
                        });
                      }
                    } else {
                      sendMessage({
                        type: 'location-selected',
                        lat: lat,
                        lng: lng,
                        address: ''
                      });
                    }
                  } catch (retryError) {
                    console.error('Retry reverse geocoding error:', retryError);
                    sendMessage({
                      type: 'location-selected',
                      lat: lat,
                      lng: lng,
                      address: ''
                    });
                  }
                }
              } catch (error) {
                console.error('WebView reverse geocoding error:', error);
                // Don't send coordinates - let handleMapMessage handle it
                sendMessage({
                  type: 'location-selected',
                  lat: lat,
                  lng: lng,
                  address: ''
                });
              }
            };

            marker.on('dragend', function(e) {
              const position = marker.getLatLng();
              updateLocation(position.lat, position.lng);
            });

            map.on('click', function(e) {
              const lat = e.latlng.lat;
              const lng = e.latlng.lng;
              marker.setLatLng([lat, lng]);
              updateLocation(lat, lng);
            });

            // Initial location update
            updateLocation(${initialLat}, ${initialLng});

            ${isWeb ? `
            // Listen for messages from parent (if needed)
            window.addEventListener('message', function(event) {
              // Handle any messages from parent if needed
            });
            ` : ''}
          </script>
        </body>
      </html>
    `;
}
