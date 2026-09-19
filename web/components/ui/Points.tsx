export default function Points({
  points,
  className,
}: {
  points: { id: string; title: string; text: string }[];
  className?: string;
}) {
  return (
    <ul className={`w-full${className ? ` ${className}` : ""}`}>
      {points.map((point) => (
        <li key={point.id} className="py-20 border-t border-brown-dark last:border-b">
          <div className="type-caption text-white uppercase mb-10" dangerouslySetInnerHTML={{ __html: point.title }} />
          <div className="txt type-body-md" dangerouslySetInnerHTML={{ __html: point.text }} />
        </li>
      ))}
    </ul>
  );
}
