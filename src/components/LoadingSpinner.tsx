import React from 'react';

export default function LoadingSpinner({ className = '', color = '#ea580c', size = 32 }) {
  return (
    <span
      className={`animate-spin rounded-full border-t-2 border-b-2 ${className}`}
      style={{
        borderColor: `${color} transparent ${color} transparent`,
        width: size,
        height: size,
        display: 'inline-block',
      }}
      role="status"
    />
  );
} 