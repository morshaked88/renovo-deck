'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { I18N, type Lang } from '@/lib/i18n';

gsap.registerPlugin(ScrollTrigger);

type T = (k: string) => string;
const NAV = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13'];
const THEMES = ['dark', 'light', 'dark', 'light', 'dark', 'light', 'dark', 'dark', 'dark', 'dark', 'dark', 'light', 'dark'];

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
function Photo({ src, w, h, alt, priority }: { src: string; w: number; h: number; alt: string; priority?: boolean }) {
  return (
    <div className="ph parallax">
      <Image src={src} alt={alt} width={w} height={h} sizes="100vw" priority={priority} quality={78} style={{ objectFit: 'cover' }} />
    </div>
  );
}

/* ---------- deck ---------- */
export default function Deck() {
  const [lang, setLang] = useState<Lang>('he');
  const [current, setCurrent] = useState(0);
  const [fs, setFs] = useState(false);
  const [fsOK, setFsOK] = useState(false);
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
    setFsOK(!!document.fullscreenEnabled);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.title = rtl ? 'רינובו — מצגת משקיעים' : 'Renovo — Investor Presentation';
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
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: sl, start: 'top 62%', once: true } });
        const words = sl.querySelectorAll('.split .w > span');
        const rv = sl.querySelectorAll('.rv');
        const up = sl.querySelectorAll('.rv-up');
        if (words.length) tl.from(words, { yPercent: 118, duration: 1, stagger: 0.07 }, 0);
        if (rv.length) tl.from(rv, { autoAlpha: 0, x: X * 42, duration: 1, stagger: 0.1, clearProps: 'transform,opacity,visibility' }, 0.15);
        if (up.length) tl.from(up, { autoAlpha: 0, y: 40, duration: 1, stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 0.3);
        sl.querySelectorAll('.reveal-img').forEach((el) => {
          tl.from(el, { clipPath: X > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', duration: 1.4, ease: 'power4.inOut', clearProps: 'clipPath' }, 0.05);
        });
        sl.querySelectorAll<HTMLElement>('[data-count]').forEach((el, i) => {
          const end = +el.dataset.count!, plain = el.hasAttribute('data-plain'), o = { v: plain ? end - 40 : 0 };
          el.textContent = plain ? String(Math.round(o.v)) : nf.format(0);
          tl.to(o, { v: end, duration: 1.8, ease: 'power2.out', onUpdate: () => { el.textContent = plain ? String(Math.round(o.v)) : nf.format(Math.round(o.v)); } }, 0.3 + i * 0.1);
        });
        sl.querySelectorAll('.bar i').forEach((b, i) => tl.from(b, { scaleX: 0, duration: 1.3, ease: 'power3.inOut' }, 0.5 + i * 0.18));
        const line = sl.querySelector('.tl-line i');
        if (line) {
          tl.from(line, vert ? { scaleY: 0, duration: 2.4, ease: 'power2.inOut' } : { scaleX: 0, duration: 2.4, ease: 'power2.inOut' }, 0.2);
          tl.from(sl.querySelectorAll('.tl-node'), { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.46, clearProps: 'transform,opacity,visibility' }, 0.35);
        }
        const img = sl.querySelector('.ph img');
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
  const toggleFs = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }, []);
  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const k = e.key, nextH = rtl ? 'ArrowLeft' : 'ArrowRight', prevH = rtl ? 'ArrowRight' : 'ArrowLeft';
      let d = 0;
      if (k === 'ArrowDown' || k === 'PageDown' || k === nextH || (k === ' ' && !e.shiftKey && tag !== 'button' && tag !== 'a')) d = 1;
      else if (k === 'ArrowUp' || k === 'PageUp' || k === prevH || (k === ' ' && e.shiftKey)) d = -1;
      else if (k === 'Home') { e.preventDefault(); return goTo(0); }
      else if (k === 'End') { e.preventDefault(); return goTo(NAV.length - 1); }
      else if (k === 'f' || k === 'F') return toggleFs();
      else return;
      e.preventDefault(); goTo(curRef.current + d);
    };
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('fullscreenchange', onFs); window.removeEventListener('keydown', onKey); };
  }, [rtl, goTo, toggleFs]);

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
          {fsOK && <button className="btn-ghost" type="button" onClick={toggleFs} aria-label={fs ? t('ui.presentExit') : t('ui.presentAria')}>{fs ? t('ui.presentExit') : t('ui.present')}</button>}
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
        <section className="slide cover" id="s1" data-theme="dark">
          <Photo src={img('aerial-u.jpg')} w={2200} h={1650} alt={t('alt.aerialU')} priority />
          <div className="veil veil-cover" />
          <div className="wrap cover-in">
            <h1 className="sr">{t('cover.h1')}</h1>
            <Image className="cover-logo rv" src={img('logo-white.png')} width={714} height={401} alt={t('alt.logo')} priority />
            <p className="tagline rv">HOMES INSPIRED BY YOU</p>
          </div>
          <a className="cue rv" href="#s2" aria-label="Next"><span /></a>
        </section>

        {/* 2 WHO */}
        <section className="slide light" id="s2" data-theme="light">
          <div className="wrap split2">
            <div className="col">
              <p className="eyebrow rv">{t('who.eyebrow')}</p>
              <Split k="who.h" t={t} lang={lang} />
              <p className="body rv">{t('who.p1')}</p>
              <blockquote className="quote rv">{t('who.q')}</blockquote>
              <dl className="stats3">
                <div className="rv-up"><dt>{t('who.s1l')}</dt><dd><Count value={2008} plain /></dd></div>
                <div className="rv-up"><dt>{t('who.s2l')}</dt><dd><Count value={10} /></dd></div>
                <div className="rv-up"><dt>{t('who.s3l')}</dt><dd><Count value={590} /></dd></div>
              </dl>
            </div>
            <figure className="media reveal-img">
              <div className="ph parallax"><Image src={img('aerial-u-2.jpg')} width={1800} height={1350} sizes="(max-width:900px) 100vw, 45vw" alt={t('alt.aerialU2')} /></div>
            </figure>
          </div>
        </section>

        {/* 3 MODEL */}
        <section className="slide dark" id="s3" data-theme="dark">
          <div className="wrap">
            <p className="eyebrow rv">{t('model.eyebrow')}</p>
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

        {/* 4 TWO ARMS */}
        <section className="slide light" id="s4" data-theme="light">
          <div className="wrap">
            <p className="eyebrow rv">{t('arms.eyebrow')}</p>
            <Split k="arms.h" t={t} lang={lang} />
            <p className="sub rv">{t('arms.sub')}</p>
            <div className="arms">
              {(['a1', 'a2'] as const).map((a) => (
                <article className="arm rv-up" key={a}>
                  <header><h3>{t(`arms.${a}h`)}</h3><p>{t(`arms.${a}s`)}</p></header>
                  <ul>{[1, 2, 3].map((n) => <li key={n}>{t(`arms.${a}l${n}`)}</li>)}</ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5 NUMBERS */}
        <section className="slide dark" id="s5" data-theme="dark">
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
                  {(['f1', 'f2'] as const).map((f) => (
                    <div key={f}><Html className="num big2" k={`ach.${f}n`} t={t} /><b>{t(`ach.${f}h`)}</b><small>{t(`ach.${f}p`)}</small></div>
                  ))}
                </div>
              </article>
            </div>
            <p className="strip dark-strip rv">{t('ach.strip')}</p>
          </div>
        </section>

        {/* 7 TIMELINE */}
        <section className="slide dark" id="s7" data-theme="dark">
          <div className="wrap">
            <p className="eyebrow rv">{t('tl.eyebrow')}</p>
            <Split k="tl.h" t={t} lang={lang} />
            <div className="tl">
              <div className="tl-line" aria-hidden="true"><i /></div>
              <ol>
                {[['2008', 'n1'], ['2016', 'n2'], ['2025', 'n3'], ['2026', 'n4'], ['2026', 'n5']].map(([y, n], i) => (
                  <li className="tl-node" key={i}><time>{y}</time><b>{t(`tl.${n}`)}</b><p>{t(`tl.${n}p`)}</p></li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 8 MAP */}
        <section className="slide dark" id="s8" data-theme="dark">
          <div className="wrap">
            <p className="eyebrow rv">{t('map.eyebrow')}</p>
            <Split k="map.h" t={t} lang={lang} />
            <p className="sub rv">{t('map.sub')}</p>
            <figure className="map-frame reveal-img">
              <Image src={img('map.jpg')} width={1803} height={787} sizes="(max-width:900px) 100vw, 1000px" alt={t('alt.map')} quality={80} />
            </figure>
          </div>
        </section>

        {/* 9 HERO U */}
        <section className="slide hero" id="s9" data-theme="dark">
          <Photo src={img('aerial-u.jpg')} w={2200} h={1650} alt={t('alt.aerialU')} />
          <div className="veil veil-hero" />
          <div className="wrap hero-in">
            <p className="eyebrow rv">{t('hero.eyebrow')}</p>
            <Split k="hero.u.h" t={t} lang={lang} />
            <ul className="chips rv">{[1, 2, 3, 4, 5, 6].map((n) => <li key={n}>{t(`hero.u.c${n}`)}</li>)}</ul>
            <p className="note rv">{t('hero.note')}</p>
          </div>
        </section>

        {/* 10 HERO BIALIK */}
        <section className="slide hero" id="s10" data-theme="dark">
          <Photo src={img('bialik.jpg')} w={1406} h={870} alt={t('alt.bialik')} />
          <div className="veil veil-hero" />
          <div className="wrap hero-in">
            <p className="eyebrow rv">{t('hero.eyebrow')}</p>
            <h2 className="h split" aria-label="BIALIK 360°" dir="ltr" style={{ textAlign: rtl ? 'right' : 'left' }} key={lang}>
              {['BIALIK', '360°'].map((w) => <span key={w}><span className="w" aria-hidden="true"><span>{w}</span></span>{' '}</span>)}
            </h2>
            <p className="sub rv">{t('hero.b.sub')}</p>
            <p className="note rv">{t('hero.note')}</p>
          </div>
        </section>

        {/* 11 HERO HADAR */}
        <section className="slide hero" id="s11" data-theme="dark">
          <Photo src={img('hadar.jpg')} w={876} h={553} alt={t('alt.hadar')} />
          <div className="veil veil-hero" />
          <div className="wrap hero-in">
            <p className="eyebrow rv">{t('hero.eyebrow')}</p>
            <Split k="hero.h.h" t={t} lang={lang} />
          </div>
        </section>

        {/* 12 TEAM */}
        <section className="slide light" id="s12" data-theme="light">
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

        {/* 13 CLOSING */}
        <section className="slide dark closing" id="s13" data-theme="dark">
          <Photo src={img('hadar.jpg')} w={876} h={553} alt={t('alt.hadar')} />
          <div className="veil veil-cover" />
          <div className="wrap cover-in">
            <Image className="cover-logo rv" src={img('logo-white.png')} width={714} height={401} alt={t('alt.logo')} />
            <p className="tagline rv">HOMES INSPIRED BY YOU</p>
            <Split k="end.h" t={t} lang={lang} />
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
