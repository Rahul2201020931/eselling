import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '../i18n.jsx';

const KATHMANDU = [27.7172, 85.324];

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ pin }) {
  const map = useMap();
  if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 13));
  return null;
}

const Tiles = () => (
  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
);

// Pick a place by clicking the map or using the device location. Loaded only on pages that need it.
export function MapPicker({ value, onChange }) {
  const { t } = useI18n();
  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => window.alert('Could not get your location. Click the map instead.')
    );

  return (
    <div>
      <div className="map-tools">
        <button type="button" className="secondary small" onClick={useMyLocation}>
          {t('Use my location')}
        </button>
        {value && (
          <button type="button" className="secondary small" onClick={() => onChange(null)}>
            {t('Remove pin')}
          </button>
        )}
      </div>
      <MapContainer center={value ? [value.lat, value.lng] : KATHMANDU} zoom={value ? 13 : 11} className="map">
        <Tiles />
        <ClickToPlace onPick={onChange} />
        <Recenter pin={value} />
        {value && <CircleMarker center={[value.lat, value.lng]} radius={10} pathOptions={{ color: '#1d4ed8', fillOpacity: 0.5 }} />}
      </MapContainer>
    </div>
  );
}

// Read-only map on an ad page.
export function MapView({ pin }) {
  return (
    <MapContainer center={[pin.lat, pin.lng]} zoom={14} className="map" scrollWheelZoom={false}>
      <Tiles />
      <CircleMarker center={[pin.lat, pin.lng]} radius={14} pathOptions={{ color: '#1d4ed8', fillOpacity: 0.3 }} />
    </MapContainer>
  );
}

export default MapPicker;
