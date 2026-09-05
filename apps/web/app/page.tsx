import { colors, radius } from '@tslprb/design-tokens';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* The brand's gold rule, where the hazard stripe used to be. */}
      <div style={{ height: 3, background: colors.accentStrong }} />
      <section style={{ padding: '64px 24px', maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 12, letterSpacing: 2, fontWeight: 700, color: colors.accentInk, margin: 0 }}>
          Brolly Solutions
        </p>
        <h1
          style={{
            fontSize: 40,
            lineHeight: 1.15,
            margin: '16px 0 12px',
            fontWeight: 400,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          Practise the real PWT. On your phone. Without internet.
        </h1>
        <p style={{ color: colors.ink3, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          200 questions, 3 hours, the official sections — in English and Telugu. Mobile app coming
          soon; this site will carry SEO pages and checkout.
        </p>
        <div
          style={{
            marginTop: 32,
            display: 'inline-block',
            background: colors.ink,
            color: colors.onInk,
            padding: '16px 24px',
            borderRadius: radius.sm,
            fontWeight: 700,
          }}
        >
          Get the app
        </div>
      </section>
    </main>
  );
}
