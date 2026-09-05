import { colors, hazard } from '@tslprb/design-tokens';

const rail = `repeating-linear-gradient(${hazard.angle}deg, ${colors.hivis} 0 ${hazard.stripe}px, ${colors.tar} ${hazard.stripe}px ${hazard.period}px)`;

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 6, background: rail }} />
      <section style={{ padding: '64px 24px', maxWidth: 720, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: 3.4, fontWeight: 700, color: colors.hivis, margin: 0 }}>TSLPRB</p>
        <h1 style={{ fontSize: 40, lineHeight: 1.15, margin: '16px 0 12px', fontWeight: 600 }}>
          Practise the real PWT. On your phone. Without internet.
        </h1>
        <p style={{ color: colors.dim, fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          200 questions, 3 hours, the official sections — in English and Telugu. Mobile app coming
          soon; this site will carry SEO pages and checkout.
        </p>
        <div style={{ marginTop: 32, display: 'inline-block', background: colors.hivis, color: colors.tar, padding: '16px 24px', borderRadius: 3, fontWeight: 700 }}>
          Get the app
        </div>
      </section>
    </main>
  );
}
