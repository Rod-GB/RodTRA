import React, { useEffect, useRef, useState } from 'react';
import { timestamp } from '../format';
import UpdateArticle from './UpdateArticle';
import Icon from './Icon';

export default function UpdatesView({ games, route, onNavigate, onOpen }) {
  const [feed, setFeed] = useState({ posts: [], updatedAt: 0, loading: true, message: '' });
  const [error, setError] = useState('');
  const [incoming, setIncoming] = useState(null);
  const [limit, setLimit] = useState(20);
  const current = useRef([]);
  const refresh = useRef(() => {});
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    current.current = [];
    setFeed({ posts: [], updatedAt: 0, loading: true, message: '' }); setIncoming(null); setLimit(20);
    const update = async () => {
      if (busy || controller.signal.aborted || document.hidden) return;
      busy = true;
      try {
        const query = new URLSearchParams({ game: route.feedGame, type: route.updateType });
        const response = await fetch(`/api/updates?${query}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || 'Could not load developer updates.');
        if (controller.signal.aborted) return;
        const key = post => `${post.appID}:${post.id}`;
        const ids = new Set(current.current.map(key));
        if (current.current.length && result.posts.some(post => !ids.has(key(post)))) {
          setIncoming(result);
          const updated = new Map(result.posts.map(post => [key(post), post]));
          current.current = current.current.map(post => updated.get(key(post)) || post);
          setFeed(previous => ({ ...previous, posts: current.current, message: result.message, updatedAt: result.updatedAt }));
        } else {
          current.current = result.posts; setFeed(result); setIncoming(null);
        }
        setError('');
      } catch (failure) { if (failure.name !== 'AbortError') { setError(failure.message); setFeed(previous => ({ ...previous, loading: false })); } }
      finally { busy = false; }
    };
    refresh.current = update;
    update();
    const interval = setInterval(update, 10000);
    document.addEventListener('visibilitychange', update);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, [route.feedGame, route.updateType]);
  const showIncoming = () => { current.current = incoming.posts; setFeed(incoming); setIncoming(null); };
  return <section className="updates-view" aria-labelledby="updates-title">
    <div className="page-heading"><div><p className="eyebrow">From the developers</p><h1 id="updates-title">Stay in the <span>loop.</span></h1><p>Patch notes and announcements from games in our Steam collection.</p></div><button className="secondary-button" onClick={() => refresh.current()}>Refresh feed</button></div>
    <div className="feed-controls"><label>Game<select value={route.feedGame} onChange={event => onNavigate({ feedGame: event.target.value })}><option value="">All tracked games</option>{games.map(game => <option key={game.appID} value={game.appID}>{game.title}</option>)}</select></label><label>Post type<select value={route.updateType} onChange={event => onNavigate({ updateType: event.target.value })}><option value="">All updates</option><option value="patch">Patch notes</option><option value="news">Developer announcements</option></select></label></div>
    <div className="lineup-meta"><span>Newest collected posts first</span><span>{feed.updatedAt ? `Feed checked ${timestamp(feed.updatedAt)}` : 'Collecting updates in small batches…'}</span></div>
    {incoming && <button className="new-posts-button" onClick={showIncoming}>New updates available — show latest <Icon name="arrow"/></button>}
    {(error || feed.message) && <p className="notice" role="status">{error || feed.message}</p>}
    <div className="updates-timeline">{feed.posts.slice(0, limit).map((post, index) => <UpdateArticle key={`${post.appID}:${post.id}`} post={post} expanded={index === 0} onOpen={onOpen}/>)}</div>
    {!feed.posts.length && <div className="empty-state"><Icon name="updates"/><h3>{feed.loading ? 'Gathering developer updates' : error ? 'Updates are temporarily unavailable' : 'No matching updates yet'}</h3><p>{feed.loading ? 'The feed fills as we check tracked games. Counts continue refreshing independently.' : 'Try another game or post type. This feed contains the latest posts collected by Gdaw.'}</p></div>}
    {limit < feed.posts.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Show older collected posts</button></div>}
    <p className="feed-note">Steam feeds are checked in batches. Full posts load when you expand them; no update text is cut short.</p>
  </section>;
}
