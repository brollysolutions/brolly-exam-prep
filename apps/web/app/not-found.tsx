import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="web-loading">
      <h1>Page not found / పేజీ కనుగొనబడలేదు</h1>
      <Link href="/tests">Browse tests / పరీక్షలను చూడండి</Link>
    </main>
  );
}
