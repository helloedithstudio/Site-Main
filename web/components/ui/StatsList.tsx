// "List" component: label / value rows separated by hairlines.

export type ListItem = { label: string; value: string | number };

export default function StatsList({
  items,
  padded = false,
  className,
}: {
  items: ListItem[];
  padded?: boolean;
  className?: string;
}) {
  return (
    <ul className={`relative w-full divide-y divide-brown-dark${className ? ` ${className}` : ""}`}>
      {items.map((item) => (
        <li
          key={item.label}
          className={`flex items-center gap-x-10 py-12 type-caption uppercase${padded ? " px-15" : ""}`}
        >
          <span className="text-white">{item.label}</span>
          <span className="text-white">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
