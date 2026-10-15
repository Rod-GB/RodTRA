import React from 'react';
import changelog from '../../../CHANGELOG.md';
import { parseWebsiteUpdates } from '../siteUpdates';
import { version } from '../../package.json';

const updates = parseWebsiteUpdates(changelog);
const updateDate = value => new Intl.DateTimeFormat(undefined, {
  year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date(`${value}T00:00:00`));

export default function UpdatesView() {
  return <section className="site-updates-view" aria-labelledby="updates-title">
    <div className="page-heading"><div>
      <p className="eyebrow">Gdaw changelog</p>
      <h1 id="updates-title">Website <span>updates.</span></h1>
      <p>New features, improvements and fixes for Gdaw.</p><span className="version-badge">Version {version}</span>
    </div></div>
    <div className="site-updates-list">{updates.map((update, index) => <article className="site-update" key={update.date} aria-labelledby={`update-${update.date}`}>
      <div className="site-update-meta"><time dateTime={update.date}>{updateDate(update.date)}</time>{index === 0 && <span>Latest update</span>}</div>
      <h2 id={`update-${update.date}`}>{update.title}</h2>
      {update.groups.map(group => <div className="site-update-group" key={group.title}>
        <h3>{group.title}</h3>
        <ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul>
      </div>)}
    </article>)}</div>
    {!updates.length && <div className="empty-state"><h2>No website updates yet</h2><p>New features and fixes will be listed here.</p></div>}
  </section>;
}
