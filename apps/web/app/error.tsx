'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="web-loading">
      <h1>Something went wrong / సమస్య ఏర్పడింది</h1>
      <p>Your saved answers remain in this browser.</p>
      <button onClick={reset}>Try again / మళ్లీ ప్రయత్నించండి</button>
      <a href="/tests">Tests / పరీక్షలు</a>
    </main>
  );
}
