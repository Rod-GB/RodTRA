import React, { useEffect, useRef, useState } from 'react';
import GameCard from './GameCard';
import StoreGames from './StoreGames';
import PlatformSelect from './PlatformSelect';
import { useRemote } from '../useRemote';
import { money } from '../format';
import { budgetSetSummary } from '../budgetSet';

export default function BudgetFinder({ onOpen }) {
  const options = useRemote('/api/budget/options', { interval: 30000 });
  const [platform, setPlatform] = useState('steam'), [currency, setCurrency] = useState('PHP');
  const [budget, setBudget] = useState(''), [rating, setRating] = useState('0'), [selected, setSelected] = useState([]);
  const [includeFree, setIncludeFree] = useState(false);
  const [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now);
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
    invalidate(); setPlatform(value); setCurrency(value === 'itch' ? 'USD' : 'PHP'); setBudget(value === 'epic' ? '0' : ''); setRating('0'); setSelected([]);
    setIncludeFree(value === 'epic');
  };
  const submit = async event => {
    event.preventDefault(); invalidate(); const controller = new AbortController(); request.current = controller;
    setBusy(true);
    try {
      const response = await fetch('/api/budget', { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, currency, budget, rating: Number(rating), genres: selected, includeFree, sort: 'rating' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not find games.');
      if (data.selectionMode !== 'most-games') throw new Error('Budget Finder couldn’t load a game set. Please try again shortly.');
      if (request.current !== controller || controller.signal.aborted) return;
      setResult({ ...data, platform, currency });
    } catch (failure) { if (request.current === controller && failure.name !== 'AbortError') setError(failure.message); }
    finally { if (request.current === controller) setBusy(false); }
  };
  const summary = result ? budgetSetSummary(result, clock) : null;
  const cards = games => result.platform !== 'steam' ? <StoreGames games={games}/> : <div className="game-grid">{games.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div>;
  return <section className="budget-view"><div className="page-heading"><div><p className="eyebrow">Budget Finder</p><h1>Make your budget <span>go further.</span></h1><p>Get a set of games that fits your total budget.</p></div></div>
    <form className="budget-form" onSubmit={submit}>
      <div className="budget-platform"><span>Store</span><PlatformSelect value={platform} onChange={choosePlatform}/><p className="small muted">{platform === 'steam' ? 'Steam’s top 100 · Prices in PHP' : platform === 'itch' ? 'Up to 50 new itch.io releases' : 'Free on Epic right now. Claim them before the offer ends.'}</p></div>
        <div className="budget-main-fields"><label>Total budget ({currency})<input required type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" maxLength={9} placeholder={platform === 'itch' ? 'For example, 10' : 'For example, 1000'} value={budget} onChange={change(setBudget)}/></label>
          {currencies.length > 1 && <label>Currency<select aria-label="Budget currency" value={currency} onChange={event => { invalidate(); setCurrency(event.target.value); setBudget(''); }}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>}
          {platform !== 'epic' && <label>Minimum rating<select aria-label="Minimum rating" value={rating} onChange={change(setRating)}><option value="0">Any rating</option>{(platform === 'itch' ? [['3','3+ stars'],['4','4+ stars'],['4.5','4.5+ stars']] : [['70','70%+ positive'],['80','80%+ positive'],['90','90%+ positive']]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        </div>
        <fieldset><legend>Pick up to 3 genres <span className="muted">{selected.length}/3</span></legend><div className="genre-choices">{genres.map(genre => <label key={genre}><input type="checkbox" checked={selected.includes(genre)} disabled={!selected.includes(genre) && selected.length >= 3} onChange={event => { invalidate(); setSelected(previous => event.target.checked ? [...previous, genre] : previous.filter(value => value !== genre)); }}/>{genre}</label>)}</div>{!genres.length && <p className="small muted genre-choice-note">{options.loading ? 'Loading genres…' : 'No genres listed. You can still find a game set.'}</p>}</fieldset>
        {platform !== 'epic' ? <div className="budget-options"><label><input type="checkbox" checked={includeFree} onChange={change(setIncludeFree)}/> Include free games</label></div> : <p className="small muted">These games are free and won’t use your budget.</p>}
        <button className="primary-button" disabled={busy}>{busy ? 'Finding your set…' : 'Find my game set'}</button>
      <p className="small muted">Your choices aren’t saved.</p>
    </form>
    {options.error && <p className="notice">Search choices could not load. Please try again.</p>}
    {error && <p className="notice" role="alert">{error}</p>}
    {result && <div className="budget-results" aria-live="polite"><div className="section-heading"><h2>{summary.gameCount} {summary.gameCount === 1 ? 'game' : 'games'} selected</h2><span className="small muted">One set within {money(result.budgetCents, result.currency)}</span></div>
      {result.message && <p className="notice">{result.message}</p>}
      {result.pendingChecks > 0 && <p className="small muted">More games are being checked.</p>}
      {result.unavailablePrices > 0 && <p className="small muted">Games without current prices aren’t shown.</p>}
      {result.otherCurrencies > 0 && <p className="small muted">Showing {result.currency} prices only.</p>}
      {summary.expiredCount > 0 && <p className="notice">Some offers expired. Find a new set for current prices.</p>}
      {!!summary.paid.length && cards(summary.paid)}
      {!summary.gameCount && <p className="empty-state">{['loading', 'unavailable'].includes(result.sourceState) ? 'Games could not load. Please try again.' : 'No games fit this budget. Try a higher budget or fewer filters.'}</p>}
      {!!summary.free.length && <><div className="section-heading"><h2>Free games</h2></div>{cards(summary.free)}</>}
      <div className="budget-total" aria-label="Game set total"><div><span>Your budget</span><strong>{money(result.budgetCents, result.currency)}</strong></div><div><span>Money left</span><strong>{money(summary.remainingCents, result.currency)}</strong></div><div className="budget-total-price"><span>Total price</span><strong>{money(summary.totalCents, result.currency)}</strong></div></div>
    </div>}
  </section>;
}
