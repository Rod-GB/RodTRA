import React, { useEffect, useRef, useState } from 'react';
import GameCard from './GameCard';
import { money } from '../format';

export default function BudgetFinder({ genres, onOpen }) {
  const [budget, setBudget] = useState(''), [rating, setRating] = useState('0'), [selected, setSelected] = useState([]);
  const [saleOnly, setSaleOnly] = useState(false), [includeFree, setIncludeFree] = useState(false), [sort, setSort] = useState('rating');
  const [result, setResult] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  const change = setter => event => { setter(event.target.type === 'checkbox' ? event.target.checked : event.target.value); setResult(null); };
  const submit = async event => {
    event.preventDefault(); request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/budget', { method: 'POST', cache: 'no-store', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ budget, rating: Number(rating), genres: selected, saleOnly, includeFree, sort }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not find games.');
      setResult({ ...data, minimum: Number(rating), selectedGenres: selected, saleOnly });
    } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const cards = games => <div className="game-grid">{games.map(game => <div key={game.appID}><GameCard game={game} onOpen={onOpen}/><p className="match-reason">Within {money(result.budgetCents)}{result.minimum > 0 ? ` · At least ${result.minimum}% positive` : ''}{result.selectedGenres.length ? ' · Matches a selected genre' : ''}{result.saleOnly && !game.price.free ? ' · On sale' : ''}</p></div>)}</div>;
  return <section className="budget-view"><div className="page-heading"><div><p className="eyebrow">Choose with confidence</p><h1>Find games for <span>your budget.</span></h1><p>Your budget. Your preferences. Matches from Gdaw’s tracked Steam top 100.</p></div></div>
    <form className="budget-form" onSubmit={submit}>
      <div className="budget-main-fields"><label>Total budget (PHP)<input required type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" maxLength={9} placeholder="For example, 500" value={budget} onChange={change(setBudget)}/></label>
      <label>Minimum rating<select value={rating} onChange={change(setRating)}><option value="0">Any rating</option><option value="70">70% positive or higher</option><option value="80">80% positive or higher</option><option value="90">90% positive or higher</option></select></label>
      <label>Order results<select value={sort} onChange={change(setSort)}><option value="rating">Highest rating</option><option value="price">Lowest price</option><option value="discount">Biggest discount</option></select></label></div>
      <fieldset><legend>Preferred genres <span className="muted">Optional · Choose up to three · {selected.length}/3 selected</span></legend><div className="genre-choices">{genres.map(genre => <label key={genre}><input type="checkbox" checked={selected.includes(genre)} disabled={!selected.includes(genre) && selected.length >= 3} onChange={event => { setSelected(previous => event.target.checked ? [...previous, genre] : previous.filter(value => value !== genre)); setResult(null); }}/>{genre}</label>)}</div><p className="small muted genre-choice-note">{genres.length ? `${genres.length} available genres from the tracked Steam collection. Choose any combination of up to three.` : 'Genres appear as game information loads. You can search by budget and rating while waiting.'}</p></fieldset>
      <div className="budget-options"><label><input type="checkbox" checked={saleOnly} onChange={change(setSaleOnly)}/> Discounted games only</label><label><input type="checkbox" checked={includeFree} onChange={change(setIncludeFree)}/> Include free games separately</label></div>
      <button className="primary-button" disabled={busy}>{busy ? 'Finding matches…' : 'Find games'}</button>
      <p className="small muted">Each game must fit your budget individually. Your choices are not saved and clear when you leave this page. Philippines store prices; confirm the final price on Steam.</p>
    </form>
    {error && <p className="notice" role="alert">{error}</p>}
    {result && <div className="budget-results" aria-live="polite"><div className="section-heading"><h2>{result.games.length} matching paid {result.games.length === 1 ? 'game' : 'games'}</h2><span className="small muted">Within {money(result.budgetCents)} each</span></div>
      {result.unavailablePrices > 0 && <p className="notice">{result.unavailablePrices} games have prices still loading, unavailable or awaiting refresh. They are excluded; try again shortly.</p>}
      {result.games.length ? cards(result.games) : <p className="empty-state">No paid games meet these choices. Try a different budget, rating or genre.</p>}
      {!!result.freeGames.length && <><div className="section-heading"><h2>Free alternatives</h2></div>{cards(result.freeGames)}</>}
    </div>}
  </section>;
}
