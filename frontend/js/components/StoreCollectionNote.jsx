import React from 'react';
import { timestamp } from '../format';

export default function StoreCollectionNote({ platform, data }) {
  if (platform !== 'itch') return null;
  return <aside className="collection-summary" aria-label="About the itch.io collection">
    <strong>Recent itch.io releases — up to 50 games</strong>
    <p>Games marked Released by their creators, listed newest first. Projects labeled AI Assisted or AI Generated are excluded. Unlabeled projects are not certified AI-free.</p>
    <small>{data?.updatedAt ? `Listings checked ${timestamp(data.updatedAt)}` : 'Gathering recent releases…'}{data?.pendingChecks > 0 ? ` · ${data.pendingChecks} listings awaiting checks` : ''}{data?.excludedListings > 0 ? ` · ${data.excludedListings} ineligible listings excluded` : ''}</small>
  </aside>;
}
