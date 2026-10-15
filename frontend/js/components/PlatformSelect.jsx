import React from 'react';

export const platformNames = { steam: 'Steam', epic: 'Epic Games', itch: 'itch.io' };

export default function PlatformSelect({ value, onChange }) {
  return <label className="platform-select"><span className="sr-only">Platform</span><select aria-label="Platform" value={value} onChange={event => onChange(event.target.value)}>
    {Object.entries(platformNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
  </select></label>;
}
