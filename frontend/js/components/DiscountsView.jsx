import React, { useEffect, useState } from 'react';
import { useGames } from '../useGames';
import { useStoreGames } from '../useStoreGames';
import PlatformSelect, { platformNames } from './PlatformSelect';
import GameCard from './GameCard';
import StoreGames from './StoreGames';
import StoreCollectionNote from './StoreCollectionNote';

export default function DiscountsView({ route, onNavigate, onOpen }) {
  const platform = route.platform === 'itch' ? 'itch' : 'steam', steam = platform === 'steam';
  useEffect(() => {
    if (route.platform === 'epic') onNavigate({ platform: 'steam', game: '' }, true);
  }, [route.platform, onNavigate]);
  const library = useGames('', '', 'players', steam), store = useStoreGames(platform);
  const collection = steam ? library.data.games : store.games;
  const [maximum, setMaximum] = useState(''), [saleOnly, setSaleOnly] = useState(false), [sort, setSort] = useState('price');
  const [currency, setCurrency] = useState('PHP'), [limit, setLimit] = useState(20);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const paid = collection.filter(game => game.price?.available && !game.price.free && Number.isSafeInteger(game.price.final) && game.price.final > 0);
  const fresh = paid.filter(game => !game.price.stale && game.price.checkedAt > 0 && clock / 1000 - game.price.checkedAt < 1800 && (!game.price.endsAt || game.price.endsAt * 1000 > clock));
  const currencies = [...new Set(fresh.map(game => game.price.currency))].sort();
  useEffect(() => { setMaximum(''); setSaleOnly(false); setSort('price'); setCurrency(platform === 'itch' ? 'USD' : 'PHP'); setLimit(20); }, [platform]);
  const currencyChoices = currencies.join(',');
  useEffect(() => {
    if (currencies.length && !currencies.includes(currency)) { setCurrency(currencies[0]); setMaximum(''); }
  }, [currencyChoices, currency]);
  useEffect(() => setLimit(20), [maximum, saleOnly, sort, currency]);
  const loading = steam ? library.loading : store.loading, error = steam ? library.error : store.error;
  const saleFailure = platform === 'itch' && store.data?.salesStatus !== 'loading' && !!store.data?.priceMessage;
  const checking = !steam && (store.data?.pendingChecks > 0 || store.data?.salesStatus === 'loading');
  const games = fresh.filter(game => game.price.currency === currency && (!saleOnly || game.price.discount > 0) && (maximum === '' || game.price.final <= Number(maximum) * 100))
    .sort((a, b) => sort === 'discount' ? b.price.discount - a.price.discount || a.title.localeCompare(b.title) : a.price.currency.localeCompare(b.price.currency) || a.price.final - b.price.final || a.title.localeCompare(b.title));
  const reset = () => { setMaximum(''); setSaleOnly(false); setSort('price'); };
  return <section className="discounts-view" aria-labelledby="discounts-title">
    <div className="page-heading"><div><p className="eyebrow">Paid games</p><h1 id="discounts-title">Discount<span>/Price.</span></h1><p>Regular prices and sales on {platformNames[platform]}.</p></div><PlatformSelect value={platform} platforms={['steam', 'itch']} onChange={platform => onNavigate({ platform, game: '' })}/></div>
    <StoreCollectionNote platform={platform} data={store.data}/>
    <div className="discount-controls"><label>Maximum price<input type="number" min="0" max="100000" step="0.01" placeholder="Any price" value={maximum} onChange={event => setMaximum(event.target.value)}/></label>
      {currencies.length > 1 && <label>Currency<select aria-label="Currency" value={currency} onChange={event => { setCurrency(event.target.value); setMaximum(''); }}>{[...new Set([currency, ...currencies])].map(code => <option key={code}>{code}</option>)}</select></label>}
      <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="discount">Biggest discount</option><option value="price">Lowest price</option></select></label>
      <label className="sale-toggle"><input type="checkbox" checked={saleOnly} onChange={event => setSaleOnly(event.target.checked)}/> On sale only</label><button className="quiet-button" onClick={reset}>Clear filters</button>
    </div>
    <div className="lineup-meta"><p role="status" aria-live="polite">{loading ? 'Loading prices…' : `${games.length} paid ${games.length === 1 ? 'game' : 'games'}`}</p><span>{steam ? 'Steam top 100' : 'New itch.io releases'}</span></div>
    <p className="small muted price-currency-note">Prices in {currency}.</p>
    {(error || !steam && (store.data?.message || store.data?.priceMessage)) && <p className="notice" role="status">{error || store.data?.message || store.data?.priceMessage}</p>}
    {(collection.some(game => !game.price?.available) || paid.length > fresh.length) && <p className="small muted price-coverage">Games without current prices aren’t shown.</p>}
    {steam ? <div className="game-grid">{games.slice(0, limit).map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div> : <StoreGames key={platform} games={games.slice(0, limit)} loading={loading}/>}
    {!loading && !games.length && <div className="empty-state"><h2>{error || saleOnly && saleFailure ? 'Prices could not load' : checking ? 'Checking new games…' : saleOnly ? 'No paid games on sale right now' : 'No matching paid games'}</h2><p>{error || saleOnly && saleFailure ? 'Please try again shortly.' : 'Try another store or clear the filters.'}</p></div>}
    {limit < games.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Show more offers</button></div>}
  </section>;
}
