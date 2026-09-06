interface DemandBadgeProps {
  count: number;
}

export function DemandBadge({ count }: DemandBadgeProps) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-turmeric-100 px-2.5 py-1 text-xs font-medium text-turmeric-600">
      {count} {count === 1 ? "person" : "people"} ordered this in the last hour
    </span>
  );
}
