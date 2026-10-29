/*
 * Module: siteUpdates.js
 * Folder: frontend/js
 * File: siteUpdates.js
 * Purpose: Reads the simple structure of the website changelog.
 */

// Website release notes use the CHANGELOG.md shipped with the source.
export function parseWebsiteUpdates(markdown) {
  const updates = [];
  let update;
  let group;
  for (const source of markdown.split(/\r?\n/)) {
    const line = source.trim();
    const heading = line.match(/^## (\d{4}-\d{2}-\d{2}) \| (.+)$/);
    if (heading) {
      update = { date: heading[1], title: heading[2], groups: [] };
      updates.push(update);
      group = null;
    } else if (update && line.startsWith('### ')) {
      group = { title: line.slice(4), items: [] };
      update.groups.push(group);
    } else if (update && line.startsWith('- ')) {
      if (!group) {
        group = { title: 'Changes', items: [] };
        update.groups.push(group);
      }
      group.items.push(line.slice(2));
    }
  }
  return updates.sort((left, right) => right.date.localeCompare(left.date));
}
