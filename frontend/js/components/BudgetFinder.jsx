import React, { useEffect, useRef, useState } from 'react';
import GameCard from './GameCard';
import StoreGames from './StoreGames';
import PlatformSelect from './PlatformSelect';
import { useRemote } from '../useRemote';
import { useStoreGames } from '../useStoreGames';
import { money } from '../format';

export default function BudgetFinder({ onOpen }) {
  const options = useRemote('/api/budget/options', { interval: 30000 });
  const [platform, setPlatform] = useState('steam'), [currency, setCurrency] = useState('PHP');
  const [budget, setBudget] = useState(''), [rating, setRating] = useState('0'), [selected, setSelected] = useState([]);
  const [saleOnly, setSaleOnly] = useState(false), [includeFree, setIncludeFree] = useState(false), [sort, setSort] = useState('rating');
  const [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now);
  const epic = useStoreGames(platform === 'epic' ? 'epic' : 'steam');
  const request = useRef(null);
  const genres = options.data?.[platform]?.genres || [], currencies = options.data?.[platform]?.currencies || [platform === 'itch' ? 'USD' : 'PHP'];
  const invalidate = () => { request.current?.abort(); request.current = null; setBusy(false); setResult(null); setError(''); };
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const availableCurrencies = currencies.join(',');
  useEffect(() => { if (!currencies.includes(currency)) { invalidate(); setCurrency(currencies[0]); } }, [availableCurrencies, currency]);
  const availableGenres = genres.join('\n'), chosenGenres = selected.join('\n');
  useEffect(() => {
    if (options.data?.[platform] && selected.some(genre => !genres.includes(genre))) {
      invalidate(); setSelected(previous => previous.filter(genre => genres.includes(genre)));
    }
  }, [availableGenres, chosenGenres, platform]);
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
  return <section className="budget-view"><div className="page-heading"><div><p className="eyebrow">Budget Finder</p><h1>Games within <span>your budget.</span></h1><p>Choose a store to get started.</p></div></div>
    <form className="budget-form" onSubmit={submit}>
      <div className="budget-platform"><span>Store</span><PlatformSelect value={platform} onChange={choosePlatform}/><p className="small muted">{platform === 'steam' ? 'Steam’s top 100 · Prices in PHP' : platform === 'itch' ? 'Up to 50 new itch.io releases' : 'Free on Epic right now. Claim them before the offer ends.'}</p></div>
      {platform !== 'epic' && <>
        <div className="budget-main-fields"><label>Price per game ({currency})<input required type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" maxLength={9} placeholder={platform === 'itch' ? 'For example, 5' : 'For example, 500'} value={budget} onChange={change(setBudget)}/></label>
          {currencies.length > 1 && <label>Currency<select aria-label="Budget currency" value={currency} onChange={event => { invalidate(); setCurrency(event.target.value); setBudget(''); }}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>}
          <label>Minimum rating<select aria-label="Minimum rating" value={rating} onChange={change(setRating)}><option value="0">Any rating</option>{(platform === 'itch' ? [['3','3+ stars'],['4','4+ stars'],['4.5','4.5+ stars']] : [['70','70%+ positive'],['80','80%+ positive'],['90','90%+ positive']]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Sort by<select value={sort} onChange={change(setSort)}><option value="rating">Highest rated</option><option value="price">Lowest price</option><option value="discount">Biggest discount</option></select></label>
        </div>
        <fieldset><legend>Pick up to 3 genres <span className="muted">{selected.length}/3</span></legend><div className="genre-choices">{genres.map(genre => <label key={genre}><input type="checkbox" checked={selected.includes(genre)} disabled={!selected.includes(genre) && selected.length >= 3} onChange={event => { invalidate(); setSelected(previous => event.target.checked ? [...previous, genre] : previous.filter(value => value !== genre)); }}/>{genre}</label>)}</div>{!genres.length && <p className="small muted genre-choice-note">{options.loading ? 'Loading genres…' : 'No genres listed. You can still search by price.'}</p>}</fieldset>
        <div className="budget-options"><label><input type="checkbox" checked={saleOnly} onChange={change(setSaleOnly)}/> On sale only</label><label><input type="checkbox" checked={includeFree} onChange={change(setIncludeFree)}/> Include free games</label></div>
        <button className="primary-button" disabled={busy}>{busy ? 'Finding games…' : 'Find games'}</button>
      </>}
      <p className="small muted">Your choices aren’t saved.</p>
    </form>
    {platform === 'epic' && <div className="budget-results"><div className="section-heading"><h2>Free on Epic</h2></div>{(epic.error || epic.data?.message) && <p className="notice" role="status">{epic.error || epic.data.message}</p>}<StoreGames games={[...epic.games].sort((a,b) => a.endsAt - b.endsAt)} loading={epic.loading}/>{!epic.loading && !epic.games.length && <p className="empty-state">{epic.error || !epic.data?.ready ? 'Free games could not load. Please try again.' : 'No free games right now. Check back soon.'}</p>}</div>}
    {options.error && platform !== 'epic' && <p className="notice">Search choices could not load. Please try again.</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    {result && <div className="budget-results" aria-live="polite"><div className="section-heading"><h2>{paid.length} {paid.length === 1 ? 'paid game' : 'paid games'}</h2><span className="small muted">Up to {money(result.budgetCents, result.currency)} each</span></div>
      {result.message && <p className="notice">{result.message}</p>}
      {result.pendingChecks > 0 && <p className="small muted">More games are being checked.</p>}
      {result.unavailablePrices > 0 && <p className="small muted">Games without current prices aren’t shown.</p>}
      {result.otherCurrencies > 0 && <p className="small muted">Showing {result.currency} prices only.</p>}
      {(paid.length + free.length < result.games.length + result.freeGames.length) && <p className="notice">Some prices have changed. Search again for current offers.</p>}
      {paid.length ? cards(paid) : <p className="empty-state">{['loading', 'unavailable'].includes(result.sourceState) ? 'Games could not load. Please try again.' : 'No paid games found. Try a higher budget or fewer filters.'}</p>}
      {!!free.length && <><div className="section-heading"><h2>Free games</h2></div>{cards(free)}</>}
    </div>}
  </section>;
}
