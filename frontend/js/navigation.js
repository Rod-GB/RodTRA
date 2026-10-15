// Keep each page and its filters independently addressable.
export function readRoute() {
  const [path, query = ''] = window.location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const requested = path?.replace(/^\//, '') || 'dashboard';
  const legacyStore = ['epic', 'itch'].includes(requested) ? requested : '';
  const view = legacyStore ? 'all-games' : ['dashboard', 'all-games', 'genres', 'most-played', 'updates', 'budget', 'discounts'].includes(requested) ? requested : 'dashboard';
  const platform = ['all-games', 'genres', 'discounts'].includes(view) ? legacyStore || (['epic', 'itch'].includes(params.get('platform')) ? params.get('platform') : 'steam') : 'steam';
  const game = params.get('game') || '';
  return {
    view,
    platform,
    genre: view === 'genres' || view === 'all-games' ? params.get('genre') || '' : '',
    search: view === 'all-games' ? params.get('q') || '' : '',
    sort: view === 'all-games' && (platform === 'steam' ? ['players', 'rating', 'title'] : ['players', 'title']).includes(params.get('sort')) ? params.get('sort') : 'players',
    game: view !== 'updates' && platform === 'steam' && /^\d+$/.test(game) && Number(game) > 0 && Number.isSafeInteger(Number(game)) ? game : '',
    tab: ['overview', 'reviews', 'updates'].includes(params.get('tab')) ? params.get('tab') : 'overview',
  };
}

export function routeURL(route) {
  const params = new URLSearchParams();
  if (['all-games', 'genres', 'discounts'].includes(route.view) && ['epic', 'itch'].includes(route.platform)) params.set('platform', route.platform);
  if (route.view === 'genres' || route.view === 'all-games') {
    if (route.genre) params.set('genre', route.genre);
    if (route.view === 'all-games') {
      if (route.search) params.set('q', route.search);
      if (route.sort && route.sort !== 'players') params.set('sort', route.sort);
    }
  }
  if (route.view !== 'updates' && (!route.platform || route.platform === 'steam') && route.game) {
    params.set('game', route.game);
    if (route.tab && route.tab !== 'overview') params.set('tab', route.tab);
  }
  return `#/${route.view}${params.size ? `?${params}` : ''}`;
}
