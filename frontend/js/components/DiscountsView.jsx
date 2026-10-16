import React, { useEffect, useState } from 'react';
import { useGames } from '../useGames';
import { useStoreGames } from '../useStoreGames';
import PlatformSelect, { platformNames } from './PlatformSelect';
import GameCard from './GameCard';
import StoreGames from './StoreGames';
import StoreCollectionNote from './StoreCollectionNote';

export default function DiscountsView({ route, onNavigate, onOpen }) {
  const platform = route.platform || 'steam', steam = platform === 'steam';
  const library = useGames('', '', 'players', steam), store = useStoreGames(platform);
  const collection = steam ? library.data.games : store.games;
  const [maximum, setMaximum] = useState(''), [saleOnly, setSaleOnly] = useState(true), [sort, setSort] = useState('discount');
  const [currency, setCurrency] = useState('PHP'), [limit, setLimit] = useState(20);
  const currencies = [...new Set(collection.filter(game => game.price?.available).map(game => game.price.currency))].sort();
  useEffect(() => { setMaximum(''); setCurrency(platform === 'itch' ? 'USD' : 'PHP'); setLimit(20); }, [platform]);
  const currencyChoices = currencies.join(',');
  useEffect(() => {
    if (currencies.length && !currencies.includes(currency)) { setCurrency(currencies[0]); setMaximum(''); }
  }, [currencyChoices, currency]);
  useEffect(() => setLimit(20), [maximum, saleOnly, sort, currency]);
  const loading = steam ? library.loading : store.loading, error = steam ? library.error : store.error;
  const saleFailure = platform === 'itch' && store.data?.salesStatus !== 'loading' && !!store.data?.priceMessage;
  const checking = !steam && (store.data?.pendingChecks > 0 || store.data?.salesStatus === 'loading');
  const fresh = collection.filter(game => game.price?.available && !game.price.stale);
  const games = fresh.filter(game => game.price.currency === currency && (!saleOnly || game.price.discount > 0) && (maximum === '' || game.price.final <= Number(maximum) * 100))
    .sort((a, b) => sort === 'discount' ? b.price.discount - a.price.discount || a.title.localeCompare(b.title) : a.price.currency.localeCompare(b.price.currency) || a.price.final - b.price.final || a.title.localeCompare(b.title));
  const reset = () => { setMaximum(''); setSaleOnly(true); setSort('discount'); };
  return <section className="discounts-view" aria-labelledby="discounts-title">
    <div className="page-heading"><div><p className="eyebrow">Deals</p><h1 id="discounts-title">Game <span>discounts.</span></h1><p>{platform === 'epic' ? 'Free on Epic right now.' : `Games on sale on ${platformNames[platform]}.`}</p></div><PlatformSelect value={platform} onChange={platform => onNavigate({ platform, game: '' })}/></div>
    <StoreCollectionNote platform={platform} data={store.data}/>
    {platform !== 'epic' && <div className="discount-controls"><label>Maximum price<input type="number" min="0" max="100000" step="0.01" placeholder="Any price" value={maximum} onChange={event => setMaximum(event.target.value)}/></label>
      {currencies.length > 1 && <label>Currency<select aria-label="Currency" value={currency} onChange={event => { setCurrency(event.target.value); setMaximum(''); }}>{[...new Set([currency, ...currencies])].map(code => <option key={code}>{code}</option>)}</select></label>}
      <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="discount">Biggest discount</option><option value="price">Lowest price</option></select></label>
      <label className="sale-toggle"><input type="checkbox" checked={saleOnly} onChange={event => setSaleOnly(event.target.checked)}/> On sale only</label><button className="quiet-button" onClick={reset}>Clear filters</button>
    </div>}
    <div className="lineup-meta"><p role="status" aria-live="polite">{loading ? 'Checking offers…' : `${games.length} ${games.length === 1 ? 'game' : 'games'}`}</p><span>{steam ? 'Steam top 100' : platform === 'itch' ? 'New itch.io releases' : 'Epic free games'}</span></div>
    <p className="small muted price-currency-note">Prices in {currency}.</p>
    {(error || !steam && (store.data?.message || store.data?.priceMessage)) && <p className="notice" role="status">{error || store.data?.message || store.data?.priceMessage}</p>}
    {collection.length > fresh.length && <p className="small muted price-coverage">Games without current prices aren’t shown.</p>}
    {steam ? <div className="game-grid">{games.slice(0, limit).map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div> : <StoreGames key={platform} games={games.slice(0, limit)} loading={loading}/>}
    {!loading && !games.length && <div className="empty-state"><h2>{error || saleFailure ? 'Offers could not be checked' : checking ? 'Checking new games…' : 'No matching offers right now'}</h2><p>{error || saleFailure ? 'Sale prices could not load. Please try again.' : 'Try another store or price.'}</p></div>}
    {limit < games.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Show more offers</button></div>}
  </section>;
}
