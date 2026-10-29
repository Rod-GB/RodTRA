/*
 * Component: StoreCollectionNote
 * Folder: frontend/js/components
 * File: StoreCollectionNote.jsx
 * Purpose: Gives the itch.io list a brief scope label and optional
 *   explanation.
 */

import React from 'react';
import { timestamp } from '../format';

export default function StoreCollectionNote({ platform, data }) {
  if (platform !== 'itch') return null;
  return <aside className="collection-summary" aria-label="About itch.io games">
    <span>Up to 50 new releases from itch.io.</span>
    <details><summary>About this list</summary>
      <p>Newest first. Only games marked Released are shown. Games labelled AI Assisted or AI Generated are hidden; games without a label may still use AI.</p>
      <small>{data?.updatedAt ? `Updated ${timestamp(data.updatedAt)}` : 'Loading new releases…'}{data?.pendingChecks > 0 ? ' · More games are being checked.' : ''}</small>
    </details>
  </aside>;
}
