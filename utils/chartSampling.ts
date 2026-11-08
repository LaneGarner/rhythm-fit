// Keep the first/last point and each bucket's extrema. Only display points are
// sampled; exact workout records and statistics are never changed.
export function sampleChartPoints<T extends { value: number }>(
  data: T[],
  maximum = 160
): T[] {
  if (data.length <= maximum) return data;
  const buckets = Math.max(1, Math.floor((maximum - 2) / 2));
  const selected = new Set<number>([0, data.length - 1]);
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = 1 + Math.floor((bucket * (data.length - 2)) / buckets);
    const end = 1 + Math.floor(((bucket + 1) * (data.length - 2)) / buckets);
    let low = start,
      high = start;
    for (let i = start; i < end; i++) {
      if (data[i].value < data[low].value) low = i;
      if (data[i].value > data[high].value) high = i;
    }
    selected.add(low);
    selected.add(high);
  }
  return Array.from(selected)
    .sort((a, b) => a - b)
    .map(index => data[index]);
}
