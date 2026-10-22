/** Each persona contributes equal rank weight, independently of list/attendee order. */
export function selectPoolIds(lists: ReadonlyArray<ReadonlyArray<{ entity_id: string }>>, limit = 8): string[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    const unique = [...new Set(list.map(entity => entity.entity_id.toLowerCase()))];
    unique.forEach((id, rank) => {
      // Integer reciprocal-rank points avoid floating summation depending on attendee order.
      scores.set(id, (scores.get(id) ?? 0) + Math.round(1_000_000 / (rank + 1)));
    });
  }
  return [...scores].sort(([idA, scoreA], [idB, scoreB]) => scoreB - scoreA || (idA < idB ? -1 : idA > idB ? 1 : 0)).slice(0, limit).map(([id]) => id);
}
