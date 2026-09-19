import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="edith-notfound">
      <p className="type-caption uppercase text-gold">Error 404</p>
      <h1 className="type-h2">This page does not exist</h1>
      <p className="type-body-lg text-white">It may have moved, or the link may be wrong.</p>
      <Link href="/" className="uline type-caption uppercase">
        Back to edith
      </Link>
    </main>
  );
}
