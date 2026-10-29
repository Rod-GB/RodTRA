import React from 'react';

export const platformNames = { steam: 'Steam', epic: 'Epic Games', itch: 'itch.io' };

export default function PlatformSelect({ value, onChange, platforms = Object.keys(platformNames) }) {
  return <label className="platform-select"><span className="sr-only">Platform</span><select aria-label="Platform" value={value} onChange={event => onChange(event.target.value)}>
    {platforms.map(id => <option key={id} value={id}>{platformNames[id]}</option>)}
  </select></label>;
}
