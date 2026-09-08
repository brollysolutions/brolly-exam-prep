'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n, initI18n } from '@/lib/i18n';
import { useLangStore } from '@/data/lang';
import { webLangOverride } from '@/data/langOverride';
import { useSessionStore } from '@/data/session';
import { Home, Library, Profile, SignIn, Onboarding, Welcome } from './screens';
import { Study, Topic, News, Eligibility, Paper } from './content-screens';
import { Exam, Results } from './exam';
import { Button, useCopy } from './web-ui';

const initialLang = webLangOverride() ?? useLangStore.getState().lang;
initI18n(initialLang);
if (initialLang !== useLangStore.getState().lang) useLangStore.getState().setLang(initialLang);

function Application({ route, id }: { route: string; id?: string }) {
  const copy = useCopy();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const signedIn = useSessionStore((s) => Boolean(s.token));
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then((registration) => {
          registration.active?.postMessage({
            type: 'CACHE_PUBLIC_ASSETS',
            route: window.location.pathname,
            urls: performance.getEntriesByType('resource').map((entry) => entry.name),
          });
        })
        .catch(() => undefined);
    }
    const offlineNavigation = (event: MouseEvent) => {
      if (
        navigator.onLine ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest?.('a');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.hash) return;
      event.preventDefault();
      event.stopPropagation();
      location.assign(url.href);
    };
    document.addEventListener('click', offlineNavigation, true);
    return () => document.removeEventListener('click', offlineNavigation, true);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  let content;
  switch (route) {
    case 'tests':
      content = <Library />;
      break;
    case 'login':
      content = <SignIn />;
      break;
    case 'welcome':
      content = <Welcome />;
      break;
    case 'post':
    case 'category':
      content = <Onboarding step={route} />;
      break;
    case 'profile':
      content = <Profile />;
      break;
    case 'study':
      content = <Study />;
      break;
    case 'topic':
      content = <Topic id={id!} />;
      break;
    case 'updates':
    case 'affairs':
      content = <News kind={route} />;
      break;
    case 'eligibility':
      content = <Eligibility />;
      break;
    case 'paper':
      content = <Paper id={id!} />;
      break;
    case 'exam':
      content = <Exam key={id} id={id!} />;
      break;
    case 'result':
    case 'solutions':
      content = <Results key={`${route}:${id}`} id={id!} solutions={route === 'solutions'} />;
      break;
    default:
      content = <Home />;
  }
  const nav = [
    ['/', copy('Home', 'హోమ్')],
    ['/tests', copy('Tests', 'పరీక్షలు')],
    ['/study', copy('Study', 'అధ్యయనం')],
    ['/profile', copy('Profile', 'ప్రొఫైల్')],
  ];
  return (
    <div className="website" data-lang={lang}>
      <a className="skip-link" href="#main-content">
        {copy('Skip to content', 'విషయానికి వెళ్ళండి')}
      </a>
      <header className="site-header">
        <div className="header-inner">
          {route !== 'exam' && (
            <nav aria-label={copy('Main navigation', 'ప్రధాన నావిగేషన్')}>
              {nav.map(([href, label]) => (
                <Link key={href} href={href} aria-current={
                  pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'page' : undefined
                }>{label}</Link>
              ))}
            </nav>
          )}
          <div className="header-actions">
            <Button variant="outline" onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
              aria-label={copy('Switch to Telugu', 'Switch to English')}>
              {lang === 'en' ? 'తెలుగు' : 'English'}
            </Button>
            {!signedIn && route !== 'login' && route !== 'exam' && (
              <Link className="sign-in-link" href="/login">{copy('Sign in', 'సైన్ ఇన్')}</Link>
            )}
          </div>
        </div>
      </header>
      <main id="main-content" className={route === 'exam' ? 'main-content exam-main' : 'main-content'}>
        {content}
      </main>
    </div>
  );
}
export default function Website(props: { route: string; id?: string }) {
  return (
    <I18nextProvider i18n={i18n}>
      <Application {...props} />
    </I18nextProvider>
  );
}
