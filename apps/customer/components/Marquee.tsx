export function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-ink-100 bg-turmeric-100/40 py-2">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-sm font-medium text-turmeric-600">
        {doubled.map((item, i) => (
          <span key={i}>✦ {item}</span>
        ))}
      </div>
    </div>
  );
}
