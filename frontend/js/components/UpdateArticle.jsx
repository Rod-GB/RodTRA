import React, { useEffect, useState } from 'react';
import { date, steamImage } from '../format';
import Icon from './Icon';
import PatchBody from './PatchBody';

export default function UpdateArticle({ post, expanded = false, onOpen }) {
  const [open, setOpen] = useState(expanded);
  const [body, setBody] = useState(post.text ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setBody(post.text ?? null); setError(''); }, [post.text, post.version]);
  useEffect(() => {
    if (!open || body != null) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    const query = new URLSearchParams({ id: post.appID, post: post.id, time: post.time, revision: post.version || '' });
    fetch(`/api/update?${query}`, { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Could not load the full update.');
      setBody(result.post.text); setError(result.message || '');
    }).catch(failure => { if (failure.name !== 'AbortError') setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, body, post.appID, post.id, post.time, post.version, attempt]);
  return <article className={`patch-card ${post.appID ? 'feed-article' : ''}`}>
    {post.appID && <button className="feed-game" onClick={() => onOpen(post.appID)}>{steamImage(post.gameImage) && <img src={steamImage(post.gameImage)} alt="" loading="lazy"/>}<span>{post.gameTitle}</span><Icon name="arrow"/></button>}
    <div className="patch-meta"><span>{post.patch ? 'Patch notes' : 'Developer update'}</span><time dateTime={new Date(post.time * 1000).toISOString()}>{date(post.time)}</time></div>
    <h4>{post.title}</h4>
    <details className="patch-content" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{open ? 'Collapse update' : 'Read full update'}</summary>
      {loading && <p className="small muted update-loading" role="status">Loading the complete developer post…</p>}
      {error && <p className="notice" role="status">{error}{body == null && <button className="quiet-button" onClick={() => setAttempt(value => value + 1)}> Retry</button>}</p>}
      {body != null && <PatchBody text={body}/>}
    </details>
    <a className="patch-source" href={post.url} target="_blank" rel="noreferrer">Source: Steam <Icon name="arrow"/></a>
  </article>;
}
