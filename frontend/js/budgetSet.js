// Recompute the visible set when an offer expires; no choices are persisted.
export function budgetSetSummary(result, now = Date.now()) {
  const current = game => {
    const price = game.price;
    return price?.available && price.currency === result.currency && !price.stale &&
      Number.isSafeInteger(price.final) && price.final >= 0 && price.checkedAt > 0 &&
      now / 1000 - price.checkedAt < 1800 && (!price.endsAt || price.endsAt * 1000 > now) &&
      (game.source !== 'epic' || game.endsAt * 1000 > now);
  };
  const originalPaid = result.games || [], originalFree = result.freeGames || [];
  const paid = originalPaid.filter(current), free = originalFree.filter(current);
  const totalCents = [...paid, ...free].reduce((sum, game) => sum + game.price.final, 0);
  return {
    paid, free, totalCents, remainingCents: result.budgetCents - totalCents,
    gameCount: paid.length + free.length,
    expiredCount: originalPaid.length + originalFree.length - paid.length - free.length,
  };
}
