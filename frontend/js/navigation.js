// Keep sections, filters, and game details accessible through browser links.
export function readRoute() {
  const [path, query = ''] = window.location.hash.slice(1).split('?');
  const view = path?.replace(/^\//, '') || 'dashboard';
  const params = new URLSearchParams(query);
  const game = params.get('game') || '';
  return {
    view: ['dashboard', 'genres', 'most-played'].includes(view) ? view : 'dashboard',
    genre: params.get('genre') || '',
    browse: params.get('browse') === 'all',
    search: params.get('q') || '',
    sort: ['players', 'rating', 'title'].includes(params.get('sort')) ? params.get('sort') : 'players',
    game: /^\d+$/.test(game) && Number(game) > 0 && Number.isSafeInteger(Number(game)) ? game : '',
    tab: ['overview', 'reviews', 'updates'].includes(params.get('tab')) ? params.get('tab') : 'overview',
  };
}

export function routeURL(route) {
  const params = new URLSearchParams();
  if (route.view === 'genres') {
    if (route.genre) params.set('genre', route.genre);
    else if (route.browse) params.set('browse', 'all');
    if (route.search) params.set('q', route.search);
    if (route.sort && route.sort !== 'players') params.set('sort', route.sort);
  }
  if (route.game) {
    params.set('game', route.game);
    if (route.tab && route.tab !== 'overview') params.set('tab', route.tab);
  }
  return `#/${route.view}${params.size ? `?${params}` : ''}`;
}