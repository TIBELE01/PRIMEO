// Web stub for react-native-webview
// On web we use a native <iframe> element; on mobile this never runs (real package used).
import React from 'react';

export const WebView = ({ source, style, onLoadEnd, onLoadStart, onNavigationStateChange }) => {
  const uri = source?.uri ?? null;
  const html = source?.html ?? null;

  const iframeStyle = {
    border: 'none',
    width: '100%',
    flex: 1,
    ...(style || {}),
  };

  if (html) {
    return React.createElement('iframe', {
      srcDoc: html,
      style: iframeStyle,
      sandbox: 'allow-scripts allow-same-origin allow-forms',
      onLoad: onLoadEnd,
    });
  }

  return React.createElement('iframe', {
    src: uri,
    style: iframeStyle,
    onLoad: onLoadEnd,
  });
};

export default WebView;
