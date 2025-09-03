import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface NavigationMapProps {
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
  donorName: string;
  foodTitle: string;
}

export const NavigationMap: React.FC<NavigationMapProps> = ({
  destination,
  donorName,
  foodTitle,
}) => {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [navigationStarted, setNavigationStarted] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required for navigation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Calculate distance and estimated time
      const dist = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        destination.latitude,
        destination.longitude
      );
      setDistance(`${dist.toFixed(1)} km`);
      setEstimatedTime(`${Math.ceil(dist * 2)} min`); // Rough estimate: 2 min per km
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const startNavigation = () => {
    setNavigationStarted(true);
    Alert.alert(
      'Navigation Started!',
      'Follow the route shown on the map. The app will guide you to the pickup location.',
      [{ text: 'Got it!' }]
    );
  };

  const openExternalNavigation = () => {
    const toParam = encodeURIComponent(destination.address || `${destination.latitude},${destination.longitude}`);
    const url = `https://www.openstreetmap.org/directions?to=${toParam}`;

    if (Platform.OS === 'web') {
      // @ts-ignore
      window.open(url, '_blank');
      return;
    }

    Alert.alert(
      'OpenStreetMap Directions',
      'This will open OpenStreetMap in your browser for navigation to the address.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open OSM', onPress: async () => { try { await Linking.openURL(url); } catch {} } }
      ]
    );
  };

  const generateMapHTML = () => {
    const startLat = userLocation?.latitude || destination.latitude;
    const startLon = userLocation?.longitude || destination.longitude;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pickup Navigation</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        #map { height: 100vh; width: 100%; }
        .navigation-header {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
        }
        .nav-title { 
          font-weight: bold; 
          font-size: 18px; 
          color: #22c55e; 
          margin-bottom: 8px;
          display: flex;
          align-items: center;
        }
        .nav-details { 
          font-size: 14px; 
          color: #6b7280; 
          margin-bottom: 4px;
        }
        .nav-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }
        .stat-item {
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: #22c55e;
        }
        .instructions-panel {
          position: absolute;
          bottom: 20px;
          left: 10px;
          right: 10px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
        }
        .instruction-item {
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
        }
        .instruction-item:last-child {
          border-bottom: none;
        }
        .instruction-distance {
          background: #22c55e;
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          margin-right: 12px;
          min-width: 50px;
          text-align: center;
        }
        .instruction-text {
          flex: 1;
          font-size: 14px;
          color: #374151;
        }
        .leaflet-routing-container { display: none; }
        .pickup-marker {
          background: #22c55e;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }
        .user-marker {
          background: #3b82f6;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .navigation-started {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      </style>
    </head>
    <body>
      <div class="navigation-header ${navigationStarted ? 'navigation-started' : ''}">
        <div class="nav-title">
          🎯 Pickup Navigation ${navigationStarted ? '- ACTIVE' : ''}
        </div>
        <div class="nav-details">📦 ${foodTitle}</div>
        <div class="nav-details">👤 Donor: ${donorName}</div>
        <div class="nav-details">📍 ${destination.address}</div>
        <div class="nav-stats">
          <div class="stat-item">🚗 ${distance || 'Calculating...'}</div>
          <div class="stat-item">⏱️ ${estimatedTime || 'Calculating...'}</div>
        </div>
      </div>
      <div id="map"></div>
      <div class="instructions-panel" id="instructions" style="display: none;">
        <div style="font-weight: bold; margin-bottom: 12px; color: #22c55e;">📍 Turn-by-turn directions:</div>
        <div id="instructionsList"></div>
      </div>

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
      <script>
        // Initialize map
        var map = L.map('map').setView([${(startLat + destination.latitude) / 2}, ${(startLon + destination.longitude) / 2}], 13);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Custom icons
        var pickupIcon = L.divIcon({
          className: 'pickup-marker',
          html: '🎯',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        var userIcon = L.divIcon({
          className: 'user-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Add markers
        ${userLocation ? `
        var userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: userIcon})
          .addTo(map)
          .bindPopup('📍 Your Location');
        ` : ''}

        var pickupMarker = L.marker([${destination.latitude}, ${destination.longitude}], {icon: pickupIcon})
          .addTo(map)
          .bindPopup('🎯 Pickup Location<br/><strong>${foodTitle}</strong><br/>📍 ${destination.address}')
          .openPopup();

        ${userLocation ? `
        // Add routing
        var routingControl = L.Routing.control({
          waypoints: [
            L.latLng(${userLocation.latitude}, ${userLocation.longitude}),
            L.latLng(${destination.latitude}, ${destination.longitude})
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          createMarker: function() { return null; }, // Don't create default markers
          lineOptions: {
            styles: [{ color: '#22c55e', weight: 4, opacity: 0.8 }]
          },
          show: false,
          router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1'
          })
        }).on('routesfound', function(e) {
          var route = e.routes[0];
          var distance = (route.summary.totalDistance / 1000).toFixed(1);
          var time = Math.round(route.summary.totalTime / 60);
          
          // Update route info
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'routeInfo',
            distance: distance + ' km',
            time: time + ' min'
          }));

          // Show turn-by-turn instructions
          var instructionsPanel = document.getElementById('instructions');
          var instructionsList = document.getElementById('instructionsList');
          
          if (route.instructions && route.instructions.length > 0) {
            instructionsPanel.style.display = 'block';
            instructionsList.innerHTML = '';
            
            route.instructions.forEach(function(instruction, index) {
              var item = document.createElement('div');
              item.className = 'instruction-item';
              
              var distance = instruction.distance > 1000 
                ? (instruction.distance / 1000).toFixed(1) + 'km'
                : instruction.distance.toFixed(0) + 'm';
              
              item.innerHTML = 
                '<div class="instruction-distance">' + distance + '</div>' +
                '<div class="instruction-text">' + instruction.text + '</div>';
              
              instructionsList.appendChild(item);
            });
          }
        }).addTo(map);

        // Fit map to show both points
        var group = new L.featureGroup([
          L.marker([${userLocation.latitude}, ${userLocation.longitude}]),
          L.marker([${destination.latitude}, ${destination.longitude}])
        ]);
        map.fitBounds(group.getBounds().pad(0.1));
        ` : `
        // Center on destination if no user location
        map.setView([${destination.latitude}, ${destination.longitude}], 15);
        `}

        // Update location periodically if navigation is active
        ${navigationStarted ? `
        setInterval(function() {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
              var newLat = position.coords.latitude;
              var newLng = position.coords.longitude;
              
              // Update user marker position
              if (userMarker) {
                userMarker.setLatLng([newLat, newLng]);
              }
              
              // Recalculate route
              if (routingControl) {
                routingControl.setWaypoints([
                  L.latLng(newLat, newLng),
                  L.latLng(${destination.latitude}, ${destination.longitude})
                ]);
              }
            });
          }
        }, 10000); // Update every 10 seconds
        ` : ''}
      </script>
    </body>
    </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'routeInfo') {
        setDistance(data.distance);
        setEstimatedTime(data.time);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <Ionicons name="map-outline" size={48} color="#22c55e" />
            <Text style={styles.loadingText}>Loading Navigation...</Text>
          </View>
        )}
      />
      
      <View style={styles.actionBar}>
        {!navigationStarted ? (
          <TouchableOpacity 
            style={styles.startNavigationButton}
            onPress={startNavigation}
          >
            <Ionicons name="play" size={20} color="#ffffff" />
            <Text style={styles.startNavigationText}>Start Navigation</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navigationActive}>
            <Ionicons name="navigate" size={20} color="#22c55e" />
            <Text style={styles.navigationActiveText}>Navigation Active</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name="locate" size={20} color="#ffffff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.externalButton}
          onPress={openExternalNavigation}
        >
          <Ionicons name="open-outline" size={20} color="#22c55e" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startNavigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  startNavigationText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  navigationActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#22c55e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navigationActiveText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  externalButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22c55e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});
