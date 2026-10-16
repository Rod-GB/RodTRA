import React, { useEffect, useRef, useState } from 'react';
import GameCard from './GameCard';
import StoreGames from './StoreGames';
import PlatformSelect, { platformNames } from './PlatformSelect';
import { useRemote } from '../useRemote';
import { money } from '../format';

export default function BudgetFinder({ onOpen }) {
  const options = useRemote('/api/budget/options', { interval: 30000 });
  const [platform, setPlatform] = useState('steam'), [currency, setCurrency] = useState('PHP');
  const [budget, setBudget] = useState(''), [rating, setRating] = useState('0'), [selected, setSelected] = useState([]);
  const [saleOnly, setSaleOnly] = useState(false), [includeFree, setIncludeFree] = useState(false), [sort, setSort] = useState('rating');
  const [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now);
  const request = useRef(null);
  const genres = options.data?.[platform]?.genres || [], currencies = options.data?.[platform]?.currencies || [platform === 'itch' ? 'USD' : 'PHP'];
  const invalidate = () => { request.current?.abort(); request.current = null; setBusy(false); setResult(null); setError(''); };
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const availableCurrencies = currencies.join(',');
  useEffect(() => { if (!currencies.includes(currency)) { invalidate(); setCurrency(currencies[0]); } }, [availableCurrencies, currency]);
  const change = setter => event => { invalidate(); setter(event.target.type === 'checkbox' ? event.target.checked : event.target.value); };
  const choosePlatform = value => {
    invalidate(); setPlatform(value); setCurrency(value === 'itch' ? 'USD' : 'PHP'); setBudget(''); setRating('0'); setSelected([]);
    setIncludeFree(value === 'epic'); setSaleOnly(false); setSort(value === 'epic' ? 'price' : 'rating');
  };
  const submit = async event => {
    event.preventDefault(); invalidate(); const controller = new AbortController(); request.current = controller;
    setBusy(true);
    try {
      const response = await fetch('/api/budget', { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, currency, budget, rating: Number(rating), genres: selected, saleOnly, includeFree, sort }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not find games.');
      if (request.current !== controller || controller.signal.aborted) return;
      setResult({ ...data, minimum: Number(rating), selectedGenres: [...selected], saleOnly, platform, currency });
    } catch (failure) { if (request.current === controller && failure.name !== 'AbortError') setError(failure.message); }
    finally { if (request.current === controller) setBusy(false); }
  };
  const current = games => games.filter(game => !game.price?.stale && clock / 1000 - game.price.checkedAt < 1800 && (!game.price.endsAt || game.price.endsAt * 1000 > clock) && (game.source !== 'epic' || game.endsAt * 1000 > clock));
  const paid = result ? current(result.games) : [], free = result ? current(result.freeGames) : [];
  const cards = games => result.platform !== 'steam' ? <StoreGames games={games}/> : <div className="game-grid">{games.map(game => <div key={game.appID}><GameCard game={game} onOpen={onOpen}/><p className="match-reason">Within {money(result.budgetCents, result.currency)}{result.minimum > 0 ? ` · At least ${result.minimum}% positive` : ''}{result.selectedGenres.length ? ' · Matches a selected genre' : ''}{result.saleOnly && !game.price.free ? ' · On sale' : ''}</p></div>)}</div>;
  return <section className="budget-view"><div className="page-heading"><div><p className="eyebrow">Choose with confidence</p><h1>Find games for <span>your budget.</span></h1><p>Explore our Steam collection, recent itch.io releases, or active Epic giveaways.</p></div></div>
    <form className="budget-form" onSubmit={submit}>
      <div className="budget-platform"><span>Choose a store</span><PlatformSelect value={platform} onChange={choosePlatform}/><p className="small muted">{platform === 'steam' ? 'Steam top 100 collection · Philippines prices.' : platform === 'itch' ? 'Up to 50 recent releases. AI-labeled projects are excluded.' : 'Currently claimable free-to-keep giveaways. Genre and rating information is unavailable.'}</p></div>
      <div className="budget-main-fields"><label>Total budget ({currency})<input required type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" maxLength={9} placeholder="For example, 500" value={budget} onChange={change(setBudget)}/></label>
        <label>Currency<select aria-label="Budget currency" value={currency} onChange={event => { invalidate(); setCurrency(event.target.value); setBudget(''); }}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Minimum rating<select aria-label="Minimum rating" value={rating} onChange={change(setRating)} disabled={platform === 'epic'}><option value="0">{platform === 'epic' ? 'Not provided by Epic' : 'Any rating'}</option>{(platform === 'itch' ? [['3','3 / 5 stars or higher'],['4','4 / 5 stars or higher'],['4.5','4.5 / 5 stars or higher']] : [['70','70% positive or higher'],['80','80% positive or higher'],['90','90% positive or higher']]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Order results<select value={sort} onChange={change(setSort)}>{platform !== 'epic' && <option value="rating">Highest rating</option>}<option value="price">Lowest price</option><option value="discount">Biggest discount</option></select></label>
      </div>
      {platform !== 'epic' && <fieldset><legend>Preferred genres <span className="muted">Optional · Choose up to three · {selected.length}/3 selected</span></legend><div className="genre-choices">{genres.map(genre => <label key={genre}><input type="checkbox" checked={selected.includes(genre)} disabled={!selected.includes(genre) && selected.length >= 3} onChange={event => { invalidate(); setSelected(previous => event.target.checked ? [...previous, genre] : previous.filter(value => value !== genre)); }}/>{genre}</label>)}</div><p className="small muted genre-choice-note">{genres.length ? `${genres.length} available gameplay genres from ${platformNames[platform]}. Matches may belong to any selected genre.` : options.loading ? 'Loading genre choices…' : 'No genre information is available yet; budget-only searches are available.'}</p></fieldset>}
      <div className="budget-options">{platform !== 'epic' && <><label><input type="checkbox" checked={saleOnly} onChange={change(setSaleOnly)}/> Discounted games only</label><label><input type="checkbox" checked={includeFree} onChange={change(setIncludeFree)}/> Include free games separately</label></>}</div>
      <button className="primary-button" disabled={busy}>{busy ? 'Finding matches…' : 'Find games'}</button>
      <p className="small muted">Each game must fit your budget individually. No currency conversion is applied. Ratings use each store’s own scale. Your choices and results are not saved and clear when you leave this page.</p>
    </form>
    {options.error && <p className="notice">Genre and currency choices could not refresh. {options.error}</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    {result && <div className="budget-results" aria-live="polite"><div className="section-heading"><h2>{result.platform === 'epic' ? `${free.length} free ${free.length === 1 ? 'game' : 'games'}` : `${paid.length} matching paid ${paid.length === 1 ? 'game' : 'games'}`}</h2><span className="small muted">Within {money(result.budgetCents, result.currency)} each</span></div>
      {result.message && <p className="notice">{result.message}</p>}
      {result.pendingChecks > 0 && <p className="notice">{result.pendingChecks} recent listings are still being checked and are excluded until verified.</p>}
      {result.unavailablePrices > 0 && <p className="notice">{result.unavailablePrices} games have unavailable or saved prices and are excluded. Try again after they refresh.</p>}
      {result.otherCurrencies > 0 && <p className="small muted">{result.otherCurrencies} games use a different currency and are excluded from this budget.</p>}
      {(paid.length + free.length < result.games.length + result.freeGames.length) && <p className="notice">Some offers expired or their prices need refreshing. Find games again for current matches.</p>}
      {result.platform !== 'epic' && (paid.length ? cards(paid) : <p className="empty-state">{['loading', 'unavailable'].includes(result.sourceState) ? 'This collection is not available yet. Try again after it reconnects.' : 'No paid games meet these choices. Try another budget, rating, genre or currency.'}</p>)}
      {!!free.length && <><div className="section-heading"><h2>{result.platform === 'epic' ? 'Free-to-keep giveaways' : 'Free alternatives'}</h2></div>{cards(free)}</>}
      {result.platform === 'epic' && !free.length && <p className="empty-state">{['loading', 'unavailable'].includes(result.sourceState) ? 'Giveaway information is unavailable. Try again after it reconnects.' : 'No current giveaways are available. Try again after the collection refreshes.'}</p>}
    </div>}
  </section>;
}
