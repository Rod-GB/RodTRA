// Keep each page and its filters independently addressable.
export function readRoute() {
  const [path, query = ''] = window.location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const requested = path?.replace(/^\//, '') || 'dashboard';
  const view = ['dashboard', 'all-games', 'genres', 'most-played', 'updates'].includes(requested) ? requested : 'dashboard';
  const game = params.get('game') || '';
  return {
    view,
    genre: view === 'genres' || view === 'all-games' ? params.get('genre') || '' : '',
    search: view === 'all-games' ? params.get('q') || '' : '',
    sort: view === 'all-games' && ['players', 'rating', 'title'].includes(params.get('sort')) ? params.get('sort') : 'players',
    game: view !== 'updates' && /^\d+$/.test(game) && Number(game) > 0 && Number.isSafeInteger(Number(game)) ? game : '',
    tab: ['overview', 'reviews', 'updates'].includes(params.get('tab')) ? params.get('tab') : 'overview',
  };
}

export function routeURL(route) {
  const params = new URLSearchParams();
  if (route.view === 'genres' || route.view === 'all-games') {
    if (route.genre) params.set('genre', route.genre);
    if (route.view === 'all-games') {
      if (route.search) params.set('q', route.search);
      if (route.sort && route.sort !== 'players') params.set('sort', route.sort);
    }
  }
  if (route.view !== 'updates' && route.game) {
    params.set('game', route.game);
    if (route.tab && route.tab !== 'overview') params.set('tab', route.tab);
  }
  return `#/${route.view}${params.size ? `?${params}` : ''}`;
}
