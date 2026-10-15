import React, { useEffect, useState } from 'react';
import { useGames } from '../useGames';
import { useStoreGames } from '../useStoreGames';
import PlatformSelect, { platformNames } from './PlatformSelect';
import GameCard from './GameCard';
import StoreGames from './StoreGames';

export default function DiscountsView({ route, onNavigate, onOpen }) {
  const platform = route.platform || 'steam', steam = platform === 'steam';
  const library = useGames('', '', 'players', steam), store = useStoreGames(platform);
  const collection = steam ? library.data.games : store.games;
  const [maximum, setMaximum] = useState(''), [saleOnly, setSaleOnly] = useState(true), [sort, setSort] = useState('discount');
  const [currency, setCurrency] = useState('PHP'), [limit, setLimit] = useState(20);
  const currencies = [...new Set(collection.filter(game => game.price?.available).map(game => game.price.currency))].sort();
  useEffect(() => { setMaximum(''); setCurrency(platform === 'itch' ? 'USD' : 'PHP'); setLimit(20); }, [platform]);
  useEffect(() => setLimit(20), [maximum, saleOnly, sort, currency]);
  const loading = steam ? library.loading : store.loading, error = steam ? library.error : store.error;
  const fresh = collection.filter(game => game.price?.available && !game.price.stale);
  const games = fresh.filter(game => game.price.currency === currency && (!saleOnly || game.price.discount > 0) && (maximum === '' || game.price.final <= Number(maximum) * 100))
    .sort((a, b) => sort === 'discount' ? b.price.discount - a.price.discount || a.title.localeCompare(b.title) : a.price.currency.localeCompare(b.price.currency) || a.price.final - b.price.final || a.title.localeCompare(b.title));
  const reset = () => { setMaximum(''); setSaleOnly(true); setSort('discount'); };
  return <section className="discounts-view" aria-labelledby="discounts-title">
    <div className="page-heading"><div><p className="eyebrow">Make your budget go further</p><h1 id="discounts-title">Game <span>discounts.</span></h1><p>Current offers from our {platformNames[platform]} collection. Confirm the final price on the store.</p></div><PlatformSelect value={platform} onChange={platform => onNavigate({ platform, game: '' })}/></div>
    <div className="discount-controls"><label>Maximum price<input type="number" min="0" max="100000" step="0.01" placeholder="Any price" value={maximum} onChange={event => setMaximum(event.target.value)}/></label>
      <label>Currency<select aria-label="Currency" value={currency} onChange={event => { setCurrency(event.target.value); setMaximum(''); }}>{[...new Set([currency, ...currencies])].map(code => <option key={code}>{code}</option>)}</select></label>
      <label>Order by<select value={sort} onChange={event => setSort(event.target.value)}><option value="discount">Biggest discount</option><option value="price">Lowest price</option></select></label>
      <label className="sale-toggle"><input type="checkbox" checked={saleOnly} onChange={event => setSaleOnly(event.target.checked)}/> On sale only</label><button className="quiet-button" onClick={reset}>Reset prices</button>
    </div>
    <div className="lineup-meta"><p role="status" aria-live="polite">{loading ? 'Checking offers…' : `${games.length} matching games`}</p><span>{steam ? 'Steam top 100 only' : platform === 'itch' ? 'Up to 50 released games' : 'Active free-to-keep giveaways'}</span></div>
    <p className="small muted price-currency-note">Showing {currency} prices. Change currency to see other available prices; no conversion is applied.</p>
    {(error || !steam && store.data?.message) && <p className="notice" role="status">{error || store.data?.message}</p>}
    {collection.length > fresh.length && <p className="small muted price-coverage">{collection.length - fresh.length} {collection.length - fresh.length === 1 ? 'game has an unavailable or saved price and is' : 'games have unavailable or saved prices and are'} excluded until refreshed.</p>}
    {steam ? <div className="game-grid">{games.slice(0, limit).map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div> : <StoreGames key={platform} games={games.slice(0, limit)} loading={loading}/>}
    {!loading && !games.length && <div className="empty-state"><h2>No matching offers right now</h2><p>Try another platform or price. Offers appear only when the store supplies a current price and discount.</p></div>}
    {limit < games.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Show more offers</button></div>}
  </section>;
}
