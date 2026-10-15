import React, { useEffect, useRef, useState } from 'react';
import { useRemote } from '../useRemote';
import { gameImage, plainText, timestamp } from '../format';
import Price from './Price';
import ScreenshotGallery from './ScreenshotGallery';
import { MetadataPanel } from './GameMetadata';
import PatchBody from './PatchBody';

function StoreDetails({ game, onClose }) {
  const dialog = useRef(null), [tab, setTab] = useState('overview');
  const detail = useRemote('/api/itch/detail', { body: { id: game.id }, enabled: game.source === 'itch' });
  const data = detail.data ? { ...game, ...detail.data, price: game.price } : game;
  const isItch = game.source === 'itch';
  useEffect(() => { dialog.current.showModal(); }, []);
  const latest = data.posts?.find(post => /patch|hotfix|major.?update/i.test(`${post.category} ${post.title}`));
  return <dialog ref={dialog} className="game-dialog" aria-labelledby="store-detail-title" onClose={event => { if (event.target === event.currentTarget) onClose(); }}>
    <button className="dialog-close" aria-label="Close game details" onClick={() => dialog.current.close()}>×</button>
    <header className="detail-header">{gameImage(game.image) && <img src={gameImage(game.image)} alt=""/>}<div><span className="eyebrow">{isItch ? 'ITCH.IO' : 'EPIC GAMES'}</span><h2 id="store-detail-title">{game.title}</h2><a className="store-link" href={game.url} target="_blank" rel="noreferrer">Open on {isItch ? 'itch.io' : 'Epic'} ↗</a></div></header>
    <nav className="detail-nav" aria-label="Game sections">{[['overview','Overview'],['comments','Comments'],['reviews','Reviews'],['updates','Updates & devlogs']].map(([value,label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {isItch && detail.loading && <p className="small muted" role="status">Loading creator information…</p>}
    {detail.error && isItch && <p className="notice">{detail.error} <a href={game.url} target="_blank" rel="noreferrer">Read on itch.io</a></p>}
    {tab === 'overview' && <><p className="game-description">{plainText(game.description)}</p>
      <div className="store-price">{game.price ? <Price price={game.price}/> : <strong>{game.priceLabel || 'Price not provided'}</strong>}{game.currency && <span>{game.currency} · Price listed by itch.io</span>}{game.endsAt && <span>Claim before {timestamp(game.endsAt)}</span>}</div>
      <ScreenshotGallery screenshots={data.screenshots} title={game.title}/>
      <MetadataPanel releaseDate={data.releaseDate} publisher={data.publisher} studio={data.studio} update={latest && /^https:\/\//.test(latest.url) ? { url: latest.url, label: latest.date } : null}/>
    </>}
    {tab === 'comments' && <section><h3>Comments</h3>{isItch ? <><p className="small muted">Public itch.io discussions. These are comments, separate from reviews.</p>{data.comments?.length ? <div className="review-list">{data.comments.map((comment,index) => <article className="review-card" key={index}><strong>{comment.author || 'itch.io player'}</strong><p className="review-text">{comment.text}</p></article>)}</div> : <p className="empty-reviews">{detail.loading ? 'Loading public comments…' : 'No public comments available here.'}</p>}<a className="text-link" href={`${game.url}#comments`} target="_blank" rel="noreferrer">View discussions on itch.io ↗</a></> : <p className="empty-reviews">A public Epic comment feed is not available to Gdaw. <a href={game.url} target="_blank" rel="noreferrer">Open the game’s store page</a>.</p>}</section>}
    {tab === 'reviews' && <section><h3>Ratings & reviews</h3>{data.rating ? <p className="store-rating"><strong>{data.rating.stars} / 5</strong> · {new Intl.NumberFormat().format(data.rating.count)} itch.io ratings</p> : <p className="empty-reviews">{isItch && detail.loading ? 'Loading ratings…' : 'Rating information is not provided by the available feed.'}</p>}<p className="small muted">{isItch ? 'Full written reviews are not supplied by the public feed. Public discussions are under Comments.' : 'Epic player ratings and critic reviews may be available on the store page. They are separate from Steam reviews.'}</p><a className="store-link" href={game.url} target="_blank" rel="noreferrer">View ratings and available reviews on {isItch ? 'itch.io' : 'Epic'} ↗</a></section>}
    {tab === 'updates' && <section><h3>{isItch ? 'Developer updates & devlogs' : 'Developer updates'}</h3>{data.updatesMessage && <p className="notice">{data.updatesMessage}</p>}{data.posts?.length ? <div className="patch-list">{data.posts.map(post => <article className="patch-card" key={post.id || post.url}><p className="small muted">{post.date} · {post.category || 'Developer post'}</p><h4><a href={post.url} target="_blank" rel="noreferrer">{post.title}</a></h4><PatchBody text={post.text}/><a className="patch-source" href={post.url} target="_blank" rel="noreferrer">Read original post ↗</a></article>)}</div> : <p className="empty-reviews">{isItch && detail.loading ? 'Loading developer posts…' : isItch ? 'No developer update feed is available for this game.' : 'The Epic giveaway feed does not include patch notes. Check the developer’s links on the store page.'}</p>}</section>}
  </dialog>;
}

export default function StoreGames({ games, loading = false }) {
  const [selected, setSelected] = useState(null);
  const opener = useRef(null);
  const open = game => { opener.current = document.activeElement; setSelected(game); };
  const close = () => { setSelected(null); requestAnimationFrame(() => opener.current?.isConnected && opener.current.focus()); };
  // A giveaway must also disappear from an already-open dialog when it expires.
  useEffect(() => { if (selected?.source === 'epic' && !games.some(game => game.id === selected.id)) close(); }, [games, selected]);
  return <>
    {loading && !games.length && <p className="empty-state" role="status">Loading games…</p>}
    <div className="game-grid store-grid">{games.map(game => {
      const epic = game.source === 'epic';
      return <article className="game-card store-card" key={game.id}>
        <button className="card-image-button" aria-label={`Explore ${game.title}`} onClick={() => open(game)}>{gameImage(game.image) && <img src={gameImage(game.image)} alt="" loading="lazy"/>}</button>
        <div className="card-content"><p className="card-genre">{epic ? 'EPIC GIVEAWAY' : 'ITCH.IO · RELEASED'}</p><h2><button onClick={() => open(game)}>{game.title}</button></h2><p className="store-description">{plainText(game.description)}</p>
        <div className="store-price">{game.price ? <Price price={game.price}/> : <strong>{game.priceLabel || 'Price not provided'}</strong>}<span>{epic ? `Ends ${timestamp(game.endsAt)}` : game.price?.endsAt ? `${game.currency || ''} · Sale ${game.price.endsAt * 1000 <= Date.now() ? 'ended' : 'ends'} ${timestamp(game.price.endsAt)}` : game.currency ? `Listed in ${game.currency}` : 'See creator’s page for pricing'}</span></div>
        <div className="card-footer"><button className="text-link" onClick={() => open(game)}>Explore game</button><a className="text-link" href={game.url} target="_blank" rel="noreferrer">{epic ? 'Claim on Epic' : 'Open itch.io'} ↗</a></div></div>
      </article>;
    })}</div>
    {selected && <StoreDetails key={selected.id} game={games.find(game => game.id === selected.id) || selected} onClose={close}/>}
  </>;
}
