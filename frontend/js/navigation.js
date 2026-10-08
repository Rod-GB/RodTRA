// Keep each page and its filters independently addressable.
export function readRoute() {
  const [path, query = ''] = window.location.hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  let view = path?.replace(/^\//, '') || 'dashboard';
  if (view === 'genres' && params.get('browse') === 'all' && !params.get('genre')) view = 'all-games';
  const game = params.get('game') || '';
  const feedGame = params.get('filter') || '';
  return {
    view: ['dashboard', 'all-games', 'genres', 'most-played', 'updates'].includes(view) ? view : 'dashboard',
    genre: params.get('genre') || '', search: params.get('q') || '',
    sort: ['players', 'rating', 'title'].includes(params.get('sort')) ? params.get('sort') : 'players',
    game: /^\d+$/.test(game) && Number(game) > 0 && Number.isSafeInteger(Number(game)) ? game : '',
    feedGame: /^\d+$/.test(feedGame) && Number(feedGame) > 0 ? feedGame : '',
    updateType: ['patch', 'news'].includes(params.get('type')) ? params.get('type') : '',
    tab: ['overview', 'reviews', 'updates'].includes(params.get('tab')) ? params.get('tab') : 'overview',
  };
}

export function routeURL(route) {
  const params = new URLSearchParams();
  if (route.view === 'genres' || route.view === 'all-games') {
    if (route.genre) params.set('genre', route.genre);
    if (route.search) params.set('q', route.search);
    if (route.sort && route.sort !== 'players') params.set('sort', route.sort);
  }
  if (route.view === 'updates') {
    if (route.feedGame) params.set('filter', route.feedGame);
    if (route.updateType) params.set('type', route.updateType);
  }
  if (route.game) {
    params.set('game', route.game);
    if (route.tab && route.tab !== 'overview') params.set('tab', route.tab);
  }
  return `#/${route.view}${params.size ? `?${params}` : ''}`;
}
