import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ style, children }) =>
  React.createElement(View, { style: [{ backgroundColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' }, style] },
    React.createElement(Text, { style: { color: '#666', fontSize: 14 } }, '🗺️ Carte non disponible sur web'),
    children
  );

MapView.Marker = ({ children }) => React.createElement(React.Fragment, null, children);
MapView.Callout = ({ children }) => React.createElement(React.Fragment, null, children);
MapView.Polygon = () => null;
MapView.Polyline = () => null;
MapView.Circle = () => null;

export default MapView;
export const Marker = MapView.Marker;
export const Callout = MapView.Callout;
export const Polygon = MapView.Polygon;
export const Polyline = MapView.Polyline;
export const Circle = MapView.Circle;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
