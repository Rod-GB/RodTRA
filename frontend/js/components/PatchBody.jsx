import React, { useMemo } from 'react';
import { parsePatch, safePostLink } from '../patchText';
import { steamImage } from '../format';

function content(node, key) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return null;
  const tag = node.tagName.toLowerCase();
  if (['script','style','iframe','object','embed','form','input','button','link','meta'].includes(tag)) return null;
  const children = [...node.childNodes].map((child, index) => content(child, key + '-' + index));
  if (node.dataset.patchImage) return steamImage(node.dataset.patchImage) ? <img key={key} className="update-image" src={steamImage(node.dataset.patchImage)} alt="Image from the developer update" loading="lazy"/> : null;
  if (tag === 'a') {
    const href = safePostLink(node.getAttribute('href'));
    return href ? <a key={key} href={href} target="_blank" rel="noreferrer">{children}</a> : <React.Fragment key={key}>{children}</React.Fragment>;
  }
  if (/^h[1-6]$/.test(tag)) return <h5 key={key}>{children}</h5>;
  if (tag === 'table') return <div className="update-table-scroll" key={key}><table>{children}</table></div>;
  if (['p','div','ul','ol','li','strong','b','em','i','u','s','blockquote','pre','code','br','hr','thead','tbody','tr','th','td'].includes(tag))
    return React.createElement(tag, { key }, tag === 'br' || tag === 'hr' ? undefined : children);
  return <React.Fragment key={key}>{children}</React.Fragment>;
}

export default function PatchBody({ text = '' }) {
  const root = useMemo(() => parsePatch(text), [text]);
  return <div className="patch-body">{[...root.childNodes].map((node, index) => content(node, String(index)))}</div>;
}
