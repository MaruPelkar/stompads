'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const sampleSites = [
  'acmecoffee.com',
  'freshpetfoods.co',
  'novafit.studio',
  'sunnyskincare.com',
  'urbanbloom.shop',
  'craftburger.co',
  'zenmatcha.com',
  'trailgear.io',
]

function normalizeUrl(input: string): string {
  let u = input.trim()
  if (!u) return u
  u = u.replace(/^(https?:\/\/)+/i, '')
  return `https://${u}`
}

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [typingText, setTypingText] = useState('')
  const [userFocused, setUserFocused] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const siteIndexRef = useRef(0)
  const animatingRef = useRef(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  useEffect(() => {
    if (userFocused) return
    let cancelled = false
    animatingRef.current = true

    async function sleep(ms: number) {
      return new Promise(r => setTimeout(r, ms))
    }
    async function animateLoop() {
      while (!cancelled && animatingRef.current) {
        const site = sampleSites[siteIndexRef.current]
        for (let i = 0; i <= site.length; i++) {
          if (cancelled) return
          setTypingText(site.substring(0, i))
          await sleep(55 + Math.random() * 40)
        }
        await sleep(2200)
        for (let i = site.length; i >= 0; i--) {
          if (cancelled) return
          setTypingText(site.substring(0, i))
          await sleep(25 + Math.random() * 15)
        }
        await sleep(400)
        siteIndexRef.current = (siteIndexRef.current + 1) % sampleSites.length
      }
    }
    animateLoop()
    return () => { cancelled = true }
  }, [userFocused])

  function handleFocus() {
    setUserFocused(true)
    animatingRef.current = false
  }

  function handleBlur() {
    if (url.trim() === '') {
      setUserFocused(false)
      setTypingText('')
    }
  }

  function handleLaunch() {
    setLaunching(true)
    const trimmed = url.trim()

    if (trimmed) {
      const normalized = normalizeUrl(trimmed)
      if (isLoggedIn) {
        router.push(`/onboard?url=${encodeURIComponent(normalized)}`)
      } else {
        router.push(`/signup?redirect=${encodeURIComponent(`/onboard?url=${encodeURIComponent(normalized)}`)}`)
      }
    } else {
      if (isLoggedIn) {
        router.push('/onboard')
      } else {
        router.push('/signup')
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLaunch()
    }
  }

  return (
    <>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 40px', borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(255,252,248,0.88)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <a href="/" style={{
          fontFamily: 'var(--font-display)', fontSize: '26px', letterSpacing: '2px',
          color: 'var(--text)', textDecoration: 'none',
        }}>
          STOMP<span style={{ color: 'var(--orange)' }}>ADS</span>
        </a>
        {isLoggedIn ? (
          <a href="/dashboard" className="btn-secondary">Dashboard</a>
        ) : (
          <a href="/login" className="nav-link">Log in</a>
        )}
      </nav>

      {/* Hero */}
      <section style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        position: 'relative', padding: '80px 24px 60px', overflow: 'hidden',
      }}>

        {/* Floating Ad Cards */}
        {[
          { src: '/samples/ad1.png', badge: 'Instagram', isVideo: false, cls: '', style: { top: '6%', left: '2%', width: 200, height: 260, transform: 'rotate(-6deg)', animation: 'floatIn 1s 0.2s ease-out forwards, drift1 8s ease-in-out 1.2s infinite' } },
          { src: '/samples/ad4.png', badge: 'TikTok', isVideo: false, cls: '', style: { top: '3%', right: '2%', width: 175, height: 310, transform: 'rotate(4deg)', animation: 'floatIn 1s 0.5s ease-out forwards, drift2 9s ease-in-out 1.5s infinite' } },
          { src: '/samples/ad5.png', badge: 'Facebook', isVideo: false, cls: '', style: { bottom: '14%', left: '1%', width: 210, height: 210, transform: 'rotate(3deg)', animation: 'floatIn 1s 0.8s ease-out forwards, drift3 7s ease-in-out 1.8s infinite' } },
          { src: '/samples/ugc-video.mp4', badge: 'Reels', isVideo: true, cls: '', style: { bottom: '8%', right: '2%', width: 185, height: 265, transform: 'rotate(-5deg)', animation: 'floatIn 1s 1.1s ease-out forwards, drift4 10s ease-in-out 2.1s infinite' } },
          { src: '/samples/ad2.png', badge: 'YouTube', isVideo: false, cls: 'hide-mobile', style: { top: '32%', left: '0%', width: 160, height: 210, transform: 'rotate(2deg)', animation: 'floatIn 1s 0.4s ease-out forwards, drift2 8.5s ease-in-out 1.4s infinite' } },
          { src: '/samples/ad3.png', badge: 'Stories', isVideo: false, cls: 'hide-mobile', style: { top: '30%', right: '0%', width: 165, height: 220, transform: 'rotate(-3deg)', animation: 'floatIn 1s 0.7s ease-out forwards, drift3 9.5s ease-in-out 1.7s infinite' } },
        ].map((ad, i) => (
          <div key={i} className={`floating-ad ${ad.cls}`} style={{
            position: 'absolute', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)', pointerEvents: 'none', zIndex: 2, opacity: 0,
            border: '1px solid rgba(0,0,0,0.06)', ...ad.style,
          }}>
            {ad.isVideo ? (
              <video src={ad.src} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.src} alt={ad.badge} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {ad.isVideo && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255, 77, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 77, 0, 0.3)',
              }}>
                <div style={{ width: 0, height: 0, borderLeft: '10px solid #fff', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: '2px' }} />
              </div>
            )}
            <span style={{
              position: 'absolute', bottom: 6, left: 6,
              fontFamily: 'var(--font-mono)', fontSize: '8px', textTransform: 'uppercase',
              letterSpacing: '1.5px', background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)', color: 'var(--text)',
              padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,0,0,0.06)',
            }}>{ad.badge}</span>
          </div>
        ))}

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(60px, 11vw, 140px)',
          lineHeight: 0.9, letterSpacing: '-1px',
          color: 'var(--text)', position: 'relative', zIndex: 10,
          margin: 0,
        }}>
          <span style={{ color: 'var(--orange)' }}>RUN ADS.</span>
          <span style={{
            fontSize: '0.42em', color: 'var(--text)', letterSpacing: '2px',
            display: 'block', marginTop: '6px',
          }}>NOT HEADACHES.</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'clamp(11px, 1.2vw, 14px)',
          color: 'var(--text-light)', marginTop: '24px', letterSpacing: '1px',
          textTransform: 'uppercase', position: 'relative', zIndex: 10, maxWidth: '440px',
        }}>
          Paste your URL. We do the rest. Ads go live in minutes.
        </p>

        {/* URL Input + Launch — clean, no slider */}
        <div style={{
          marginTop: '36px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '16px', position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '460px',
        }}>
          <div style={{ width: '100%', position: 'relative' }}>
            <input
              id="urlInput"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              className="input"
              style={{ fontSize: '15px', padding: '16px 20px' }}
            />
            {!userFocused && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', padding: '0 20px',
                pointerEvents: 'none', fontFamily: 'var(--font-mono)',
                fontSize: '15px', color: 'var(--text-muted)', letterSpacing: '0.5px',
                overflow: 'hidden',
              }}>
                <span style={{
                  whiteSpace: 'nowrap', overflow: 'hidden',
                  borderRight: '2px solid var(--orange)',
                  animation: 'blink-caret 0.75s step-end infinite',
                }}>{typingText}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLaunch}
            disabled={launching}
            className="btn-primary"
            style={{ width: '100%', fontSize: '22px', padding: '18px', letterSpacing: '3px' }}
          >
            {launching ? 'LAUNCHING...' : 'LAUNCH MY ADS'}
          </button>

          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--text-muted)', letterSpacing: '0.5px',
          }}>
            Free to try. No credit card. No setup.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 48px', borderTop: '1px solid rgba(0,0,0,0.06)',
        textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--text-muted)', letterSpacing: '1px',
        display: 'flex', justifyContent: 'center', gap: '24px',
      }}>
        <span>&copy; 2026 StompAds</span>
        <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy</a>
        <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms</a>
      </footer>
    </>
  )
}
