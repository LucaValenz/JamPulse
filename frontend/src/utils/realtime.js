// Lo snapshot REST puo essere precedente agli eventi arrivati durante la richiesta.
export function mergeRealtime(snapshot, events, field, roomId) {
    const documents = new Map(snapshot.map(item => [item._id, item]));
    for (const item of events) {
        if (item[field] === roomId && !documents.has(item._id)) documents.set(item._id, item);
    }
    return [...documents.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}
