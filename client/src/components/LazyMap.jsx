import { lazy, Suspense } from 'react';

// The map code is only downloaded when a page actually shows a map.
const Picker = lazy(() => import('./MapPicker.jsx').then((m) => ({ default: m.MapPicker })));
const Viewer = lazy(() => import('./MapPicker.jsx').then((m) => ({ default: m.MapView })));

const fallback = <div className="map muted">Loading map...</div>;

export const LazyMapPicker = (props) => (
  <Suspense fallback={fallback}>
    <Picker {...props} />
  </Suspense>
);

export const LazyMapView = (props) => (
  <Suspense fallback={fallback}>
    <Viewer {...props} />
  </Suspense>
);
