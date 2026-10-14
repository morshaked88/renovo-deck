'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { I18N, type Lang } from '@/lib/i18n';

gsap.registerPlugin(ScrollTrigger);

type T = (k: string) => string;
const NAV = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'];
const THEMES = ['light', 'light', 'light', 'light', 'light', 'light', 'dark', 'dark', 'dark', 'dark', 'dark', 'light'];

/* ---------- small building blocks ---------- */
function Split({ k, t, lang, className = 'h' }: { k?: string; t: T; lang: Lang; className?: string }) {
  const txt = (k ? t(k) : '').replace(/\s+/g, ' ').trim();
  return (
    <h2 className={`${className} split`} aria-label={txt} key={lang}>
      {txt.split(' ').map((w, i) => (
        <span key={i}>
          <span className="w" aria-hidden="true"><span>{w}</span></span>{' '}
        </span>
      ))}
    </h2>
  );
}
function Html({ k, t, as: Tag = 'span', className }: { k: string; t: T; as?: 'span' | 'p' | 'b' | 'small'; className?: string }) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: t(k) }} />;
}
/** Counter text is owned by GSAP/effect, never by React re-renders. */
function Count({ value, plain, className = 'num' }: { value: number; plain?: boolean; className?: string }) {
  return <span className={className} data-count={value} data-plain={plain ? '' : undefined} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: plain ? String(value) : new Intl.NumberFormat('he-IL').format(value) }} />;
}
function Photo({ src, w, h, alt, priority, still }: { src: string; w: number; h: number; alt: string; priority?: boolean; still?: boolean }) {
  return (
    <div className={`ph ${still ? 'still' : 'parallax'}`}>
      <Image src={src} alt={alt} width={w} height={h} sizes="100vw" priority={priority} quality={82} style={{ objectFit: 'cover' }} />
    </div>
  );
}

/* ---------- deck ---------- */
export default function Deck() {
  const [lang, setLang] = useState<Lang>('he');
  const [current, setCurrent] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const ctxRef = useRef<gsap.Context | null>(null);
  const curRef = useRef(0);
  const rtl = lang === 'he';

  const t: T = useCallback((k) => I18N[lang][k] ?? I18N.he[k] ?? k, [lang]);
  const fmt = useCallback((n: number, plain?: boolean) => (plain ? String(n) : new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US').format(n)), [lang]);

  /* language: restore + persist */
  useEffect(() => {
    try { if (localStorage.getItem('renovo-lang') === 'en') setLang('en'); } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.title = rtl ? 'רינובו' : 'Renovo';
    try { localStorage.setItem('renovo-lang', lang); } catch {}
  }, [lang, rtl]);

  /* header/dots theme follows the current slide */
  const theme = THEMES[current];
  useEffect(() => { document.body.dataset.hdr = theme; }, [theme]);

  const setCounters = useCallback(() => {
    rootRef.current?.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      el.textContent = fmt(+el.dataset.count!, el.hasAttribute('data-plain'));
    });
  }, [fmt]);

  /* animation build — direction-aware, rebuilt on language/breakpoint/motion change */
  const build = useCallback(() => {
    const root = rootRef.current; if (!root) return;
    ctxRef.current?.revert();
    setCounters();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vert = window.matchMedia('(max-width: 900px)').matches;
    const slides = Array.from(root.querySelectorAll<HTMLElement>('.slide'));
    const X = rtl ? 1 : -1;
    const nf = new Intl.NumberFormat(rtl ? 'he-IL' : 'en-US');

    ctxRef.current = gsap.context(() => {
      slides.forEach((sl, i) => {
        ScrollTrigger.create({ trigger: sl, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) { curRef.current = i; setCurrent(i); } } });
      });
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { if (progressRef.current) progressRef.current.style.transform = `scaleX(${s.progress})`; } });
      if (reduce) return;

      slides.forEach((sl) => {
        // Replays every time the slide is entered (from above or below). Triggers are created explicitly
        // (never `once`, which self-kills and corrupts ScrollTrigger's refresh loop when built while scrolled).
        const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
        const words = sl.querySelectorAll('.split .w > span');
        const rv = sl.querySelectorAll('.rv');
        const up = sl.querySelectorAll('.rv-up');
        if (words.length) tl.from(words, { yPercent: 118, duration: 1, stagger: 0.07 }, 0);
        if (rv.length) tl.from(rv, { autoAlpha: 0, x: X * 42, duration: 1, stagger: 0.1, clearProps: 'transform,opacity,visibility' }, 0.15);
        if (up.length) tl.from(up, { autoAlpha: 0, y: 40, duration: 1, stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 0.3);
        sl.querySelectorAll('.reveal-img').forEach((el) => {
          tl.from(el, { clipPath: X > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', duration: 1.4, ease: 'power4.inOut', clearProps: 'clipPath' }, 0.05);
        });
        const zeroCounters: Array<() => void> = [];
        sl.querySelectorAll<HTMLElement>('[data-count]').forEach((el, i) => {
          const end = +el.dataset.count!, plain = el.hasAttribute('data-plain'), o = { v: plain ? end - 40 : 0 };
          el.textContent = plain ? String(Math.round(o.v)) : nf.format(0);
          zeroCounters.push(() => { el.textContent = plain ? String(end - 40) : nf.format(0); });
          tl.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = plain ? String(Math.round(o.v)) : nf.format(Math.round(o.v)); } }, 0.3 + i * 0.1);
        });
        sl.querySelectorAll('.bar i').forEach((b, i) => tl.from(b, { scaleX: 0, duration: 1.3, ease: 'power3.inOut' }, 0.5 + i * 0.18));
        const line = sl.querySelector('.tl-line i');
        if (line) {
          tl.from(line, vert ? { scaleY: 0, duration: 2.4, ease: 'power2.inOut' } : { scaleX: 0, duration: 2.4, ease: 'power2.inOut' }, 0.2);
          tl.from(sl.querySelectorAll('.tl-node'), { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.46, clearProps: 'transform,opacity,visibility' }, 0.35);
        }
        ScrollTrigger.create({ trigger: sl, start: 'top 62%', end: 'bottom 38%', onEnter: () => { zeroCounters.forEach((z) => z()); tl.restart(); }, onEnterBack: () => { zeroCounters.forEach((z) => z()); tl.restart(); } });
        // back to the hidden start state only once the slide is completely out of view
        ScrollTrigger.create({ trigger: sl, start: 'top bottom', end: 'bottom top', onLeave: () => { tl.pause(0); zeroCounters.forEach((z) => z()); }, onLeaveBack: () => { tl.pause(0); zeroCounters.forEach((z) => z()); } });
        const img = sl.querySelector('.ph:not(.still) img');
        if (img) gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: sl, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
      });
    }, root);
    ScrollTrigger.refresh();
  }, [rtl, setCounters]);

  useEffect(() => {
    let off = false;
    const run = () => { if (!off) build(); };
    // keep the current slide in place after dir/layout flips
    document.querySelectorAll('.slide')[curRef.current]?.scrollIntoView({ behavior: 'auto', block: 'start' });
    (document.fonts?.ready ?? Promise.resolve()).then(run);
    const mq = [window.matchMedia('(max-width: 900px)'), window.matchMedia('(prefers-reduced-motion: reduce)')];
    mq.forEach((m) => m.addEventListener('change', run));
    const before = () => { setCounters(); ctxRef.current?.revert(); };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', run);
    return () => {
      off = true;
      mq.forEach((m) => m.removeEventListener('change', run));
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', run);
      ctxRef.current?.revert();
    };
  }, [build, setCounters]);

  /* navigation */
  const goTo = useCallback((i: number) => {
    const slides = document.querySelectorAll('.slide');
    const n = Math.max(0, Math.min(slides.length - 1, i));
    slides[n].scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const k = e.key, nextH = rtl ? 'ArrowLeft' : 'ArrowRight', prevH = rtl ? 'ArrowRight' : 'ArrowLeft';
      let d = 0;
      if (k === 'ArrowDown' || k === 'PageDown' || k === nextH || (k === ' ' && !e.shiftKey && tag !== 'button' && tag !== 'a')) d = 1;
      else if (k === 'ArrowUp' || k === 'PageUp' || k === prevH || (k === ' ' && e.shiftKey)) d = -1;
      else if (k === 'Home') { e.preventDefault(); return goTo(0); }
      else if (k === 'End') { e.preventDefault(); return goTo(NAV.length - 1); }
      else return;
      e.preventDefault(); goTo(curRef.current + d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rtl, goTo]);

  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const img = (src: string) => `/assets/${src}`;

  return (
    <div ref={rootRef}>
      <a className="skip" href="#s2">{t('ui.skip')}</a>

      <header className="hdr" id="hdr" data-hdr={theme}>
        <a className="hdr-logo" href="#s1" aria-label="Renovo">
          <Image className="lg-w" src={img('logo-white.png')} width={714} height={401} alt="" />
          <Image className="lg-d" src={img('logo-dark.png')} width={714} height={401} alt="" />
        </a>
        <div className="hdr-tools">
          <button className="lang" type="button" role="switch" aria-checked={lang === 'en'} aria-label={t('ui.langAria')} onClick={() => setLang(rtl ? 'en' : 'he')}>
            <span className="lang-opt" data-l="he">HE</span><span className="lang-opt" data-l="en">EN</span>
          </button>
        </div>
        <div className="progress" aria-hidden="true"><i ref={progressRef as React.RefObject<HTMLElement>} /></div>
      </header>

      <nav className="dots" aria-label="Slides">
        {NAV.map((k, i) => (
          <button key={k} type="button" title={t(`nav.${k}`)} aria-label={`${t('ui.slide')} ${i + 1}: ${t(`nav.${k}`)}`} aria-current={i === current} onClick={() => goTo(i)} />
        ))}
      </nav>
      <div className="counter" aria-hidden="true">{pad(current + 1)} / {pad(NAV.length)}</div>

      <main id="deck">
        {/* 1 COVER */}
        <section className="slide cover plain" id="s1" data-theme="light">
          <div className="wrap cover-in">
            <h1 className="sr">{t('cover.h1')}</h1>
            <Image className="cover-logo rv" src={img('logo-dark.png')} width={714} height={401} alt={t('alt.logo')} priority />
            <p className="tagline rv">HOMES INSPIRED BY YOU</p>
          </div>
          <a className="cue rv" href="#s2" aria-label="Next"><span /></a>
        </section>

        {/* 2 WHO */}
        <section className="slide light" id="s2" data-theme="light">
          <div className="wrap split2 split2-wide">
            <div className="col">
              <p className="eyebrow rv">{t('who.eyebrow')}</p>
              <Split k="who.h" t={t} lang={lang} />
              <p className="body rv">{t('who.p1')}</p>
              <blockquote className="quote rv">{t('who.q')}</blockquote>
              <dl className="stats3">
                <div className="rv-up"><dt>{t('who.s1l')}</dt><dd><Count value={2008} plain /></dd></div>
                <div className="rv-up"><dt>{t('who.s2l')}</dt><dd><span className="num">#1</span></dd></div>
                <div className="rv-up"><dt>{t('who.s3l')}</dt><dd><Count value={590} /></dd></div>
              </dl>
            </div>
            <figure className="who-fig">
              <div className="media-full reveal-img">
                <Image src={img('p09-aerial.jpg')} width={2458} height={1844} sizes="(max-width:900px) 100vw, 60vw" alt={t('alt.aerialU')} quality={85} />
              </div>
              <figcaption className="rv">{t('hero.u.h')}</figcaption>
            </figure>
          </div>
        </section>

        {/* 3 TEAM */}
        <section className="slide light" id="s3" data-theme="light">
          <div className="wrap">
            <p className="eyebrow rv">{t('team.eyebrow')}</p>
            <Split k="team.h" t={t} lang={lang} />
            <ul className="team">
              {([[5, 246], [4, 250], [3, 244], [2, 221], [1, 203]] as const).map(([n, w]) => (
                <li className="rv-up" key={n}>
                  <Image src={img(`team-${n}.webp`)} width={w} height={268} alt={t(`team.a${n}`)} />
                  <b>{t(`team.n${n}`)}</b><span>{t(`team.r${n}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4 MODEL */}
        <section className="slide light" id="s4" data-theme="light">
          <div className="wrap">
            <Split k="model.h" t={t} lang={lang} />
            <p className="sub rv">{t('model.sub')}</p>
            <ol className="cards3">
              {[['01', 'hardhat-blueprints.webp', 700, 500, 'c1'], ['02', 'hand-stacking-blocks.webp', 700, 700, 'c2'], ['03', 'tower-crane.webp', 700, 700, 'c3']].map(([n, f, w, h, c]) => (
                <li className="card rv-up" key={c as string}>
                  <span className="idx">{n}</span>
                  <Image className="deco" src={img(f as string)} width={w as number} height={h as number} alt="" aria-hidden="true" />
                  <h3>{t(`model.${c}h`)}</h3><p>{t(`model.${c}p`)}</p>
                </li>
              ))}
            </ol>
            <div className="strip strip-logo rv">
              <Image className="ym-logo" src={img('logo-ym-peretz.png')} width={900} height={263} alt={t('alt.logoYm')} />
              <Html as="p" k="model.strip" t={t} />
            </div>
          </div>
        </section>

        {/* 5 TWO ARMS */}
        <section className="slide light" id="s5" data-theme="light">
          <div className="wrap">
            <p className="eyebrow rv">{t('arms.eyebrow')}</p>
            <Split k="arms.h" t={t} lang={lang} />
            <p className="sub rv">{t('arms.sub')}</p>
            <div className="arms">
              {(['a1', 'a2'] as const).map((a) => (
                <article className="arm rv-up" key={a}>
                  <header><h3>{t(`arms.${a}h`)}</h3><p>{t(`arms.${a}s`)}</p></header>
                  <ul>{(a === 'a1' ? [1, 2, 3, 4] : [1, 2]).map((n) => <li key={n}>{t(`arms.${a}l${n}`)}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 6 ACHIEVEMENTS */}
        <section className="slide light" id="s6" data-theme="light">
          <div className="wrap">
            <p className="eyebrow rv">{t('ach.eyebrow')}</p>
            <Split k="ach.h" t={t} lang={lang} />
            <p className="sub rv">{t('ach.sub')}</p>
            <div className="arms ach">
              <article className="arm rv-up">
                <header><h3>{t('ach.a1h')}</h3><p>{t('ach.a1s')}</p></header>
                <div className="badges">
                  <figure><Image src={img('badge-index.webp')} width={450} height={440} alt={t('alt.badgeIndex')} /><figcaption>{t('ach.b1')}</figcaption></figure>
                  <figure><Image src={img('badge-duns.webp')} width={820} height={380} alt={t('alt.badgeDuns')} /><figcaption>{t('ach.b2')}</figcaption></figure>
                  <figure><Image src={img('badge-coface.webp')} width={420} height={420} alt={t('alt.badgeCoface')} /><figcaption>{t('ach.b3')}</figcaption></figure>
                </div>
              </article>
              <article className="arm rv-up">
                <header><h3>{t('ach.a2h')}</h3><p>{t('ach.a2s')}</p></header>
                <div className="facts">
                  <div><Image className="cert" src={img('cert-g5.jpg')} width={862} height={1055} alt={t('alt.cert')} quality={90} /><span className="stars" role="img" aria-label={t('ach.f1h')}>{[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M12 1.8l3.06 6.55 7.14.86-5.27 4.9 1.4 7.07L12 17.6l-6.33 3.58 1.4-7.07-5.27-4.9 7.14-.86L12 1.8z" /></svg>
                  ))}</span><small>{t('ach.f1p')}</small></div>
                  <div><Html className="num big2 big2-sm" k="ach.f2n" t={t} /><b>{t('ach.f2h')}</b><small>{t('ach.f2p')}</small></div>
                </div>
              </article>
            </div>
            <p className="strip dark-strip rv">{t('ach.strip')}</p>
          </div>
        </section>

        {/* 7 NUMBERS */}
        <section className="slide dark" id="s7" data-theme="dark">
          <div className="wrap">
            <p className="eyebrow rv">{t('num.eyebrow')}</p>
            <Split k="num.h" t={t} lang={lang} />
            <div className="num-grid">
              <div className="big rv"><Count value={1051} className="num xl" /><span className="cap">{t('num.total')}</span></div>
              <div className="big rv"><Count value={25} className="num xl" /><span className="cap">{t('num.projects')}</span></div>
            </div>
            <div className="bar" role="img" aria-label={t('num.barAria')}>
              <i className="b1" style={{ flexBasis: '56.1%' }} /><i className="b2" style={{ flexBasis: '25.2%' }} /><i className="b3" style={{ flexBasis: '18.7%' }} />
            </div>
            <ul className="legend">
              {([[590, 'l1', 'k1'], [265, 'l2', 'k2'], [196, 'l3', 'k3']] as const).map(([v, l, k]) => (
                <li className="rv-up" key={l}><Count value={v} className="num" /><span>{t(`num.${l}`)}</span><u className={k} /></li>
              ))}
            </ul>
          </div>
        </section>

        {/* 8 MAP */}
        <section className="slide dark map-slide" id="s8" data-theme="dark">
          <div className="wrap wrap-wide">
            <Split k="map.h" t={t} lang={lang} />
          </div>
        </section>

        {/* 9 HERO U */}
        <section className="slide hero hero-top" id="s9" data-theme="dark">
          <Photo src={img('u-labeled.jpg')} w={1920} h={1080} alt={t('alt.aerialU')} still />
          <div className="wrap hero-in">
            <p className="eyebrow rv">{t('hero.eyebrow')}</p>
            <Split k="hero.u.h" t={t} lang={lang} />
          </div>
          <p className="disclaimer">{t('hero.note')}</p>
        </section>

        {/* 10 HERO BIALIK */}
        <section className="slide hero hero-top" id="s10" data-theme="dark">
          <Photo src={img('bialik.jpg')} w={1406} h={870} alt={t('alt.bialik')} />
          <div className="wrap hero-in">
            <p className="eyebrow rv">{t('hero.eyebrow')}</p>
            <Split k="hero.b.h" t={t} lang={lang} />
          </div>
          <p className="disclaimer">{t('hero.note')}</p>
        </section>

        {/* 11 HERO HADAR */}
        <section className="slide hero hero-top" id="s11" data-theme="dark">
          <Photo src={img('hadar-new.jpg')} w={1484} h={779} alt={t('alt.hadar')} />
          <div className="wrap hero-in">
            <p className="eyebrow rv">{t('hero.eyebrow')}</p>
            <Split k="hero.h.h" t={t} lang={lang} />
          </div>
        </section>

        {/* 12 CLOSING */}
        <section className="slide closing plain" id="s12" data-theme="light">
          <div className="wrap cover-in">
            <Image className="cover-logo rv" src={img('logo-dark.png')} width={714} height={401} alt={t('alt.logo')} />
            <p className="tagline rv">HOMES INSPIRED BY YOU</p>
            <a className="btn" href="https://www.renovo.co.il/" target="_blank" rel="noopener noreferrer">
              <span>{t('end.cta')}</span>
              <svg className="arrow" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
