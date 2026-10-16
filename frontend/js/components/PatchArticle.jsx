import React from 'react';
import { date } from '../format';
import Icon from './Icon';
import PatchBody from './PatchBody';

export default function PatchArticle({ post, expanded = false }) {
  return <article className="patch-card">
    <div className="patch-meta"><span>{post.kind || (post.patch ? 'Patch notes' : 'Developer announcement')}</span><time dateTime={new Date(post.time * 1000).toISOString()}>{date(post.time)}</time></div>
    <h4>{post.title}</h4>
    <details className="patch-content" open={expanded}>
      <summary>Read full post</summary>
      <PatchBody text={post.text}/>
    </details>
    <a className="patch-source" href={post.url} target="_blank" rel="noreferrer">Source: Steam <Icon name="arrow"/></a>
  </article>;
}
