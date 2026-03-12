'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const sampleSites = [
  'https://www.acmecoffee.com',
  'https://www.freshpetfoods.co',
  'https://www.novafit.studio',
  'https://www.sunnyskincare.com',
  'https://www.urbanbloom.shop',
  'https://www.craftburger.co',
  'https://www.zenmatcha.com',
  'https://www.trailgear.io',
]

export default function LandingPage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [budget, setBudget] = useState(50)
  const [typingText, setTypingText] = useState('')
  const [userFocused, setUserFocused] = useState(false)
  const [launching, setLaunching] = useState(false)
  const siteIndexRef = useRef(0)
  const animatingRef = useRef(true)

  // Typing animation
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
        // Type
        for (let i = 0; i <= site.length; i++) {
          if (cancelled) return
          setTypingText(site.substring(0, i))
          await sleep(55 + Math.random() * 40)
        }
        await sleep(2200)
        // Delete
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
    if (!url.trim()) {
      document.getElementById('urlInput')?.focus()
      return
    }
    setLaunching(true)
    // Redirect to signup (they'll go through onboarding after)
    router.push('/signup')
  }

  const sliderPercent = ((budget - 5) / (500 - 5)) * 100

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap');

        :root {
          --bg: #FFFCF8;
          --bg-warm: #FFF8F0;
          --text: #1A1A1A;
          --text-light: #6B6B6B;
          --text-muted: #999;
          --orange: #FF4D00;
          --orange-dim: #E04400;
          --input-bg: #F5F0EA;
          --input-border: #E0DAD2;
          --green: #1A6640;
          --slider-track: #E0DAD2;
          --font-display: 'Bebas Neue', sans-serif;
          --font-body: 'Bricolage Grotesque', sans-serif;
          --font-mono: 'DM Mono', monospace;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg) !important;
          color: var(--text) !important;
          font-family: var(--font-body) !important;
          overflow-x: hidden;
          min-height: 100vh;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          z-index: 9999;
        }

        @keyframes floatIn {
          from { opacity: 0; transform: translateY(40px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes drift1 {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-12px) rotate(-4deg); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translateY(0px) rotate(4deg); }
          50% { transform: translateY(-10px) rotate(6deg); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes blink-caret {
          from, to { border-color: var(--orange); }
          50% { border-color: transparent; }
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 48px', borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(255,252,248,0.88)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <a href="#" style={{
          fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px',
          color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px',
        }}>
          <span>STOMP</span><span style={{ color: 'var(--orange)' }}>ADS</span>
        </a>
        <a href="/signup" style={{
          fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '10px 24px',
          background: 'var(--orange)', color: '#fff', border: 'none', cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '1.5px', textDecoration: 'none',
          transition: 'all 0.3s',
        }}>Get Started</a>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        position: 'relative', padding: '120px 24px 80px', overflow: 'hidden',
      }}>
        {/* Floating Ad Cards with real images */}
        {[
          { cls: 'ad-1', src: '/samples/ad1.png', badge: 'Instagram', style: { top: '10%', left: '4%', width: 160, height: 200, transform: 'rotate(-6deg)', animation: 'floatIn 1s 0.2s ease-out forwards, drift1 8s ease-in-out 1.2s infinite' } },
          { cls: 'ad-2', src: '/samples/ad2.png', badge: 'TikTok', style: { top: '6%', right: '5%', width: 140, height: 250, transform: 'rotate(4deg)', animation: 'floatIn 1s 0.5s ease-out forwards, drift2 9s ease-in-out 1.5s infinite' } },
          { cls: 'ad-3', src: '/samples/ad3.png', badge: 'Facebook', style: { bottom: '18%', left: '6%', width: 180, height: 140, transform: 'rotate(3deg)', animation: 'floatIn 1s 0.8s ease-out forwards, drift3 7s ease-in-out 1.8s infinite' } },
          { cls: 'ad-4', src: '/samples/ad1.png', badge: 'YouTube', style: { bottom: '12%', right: '4%', width: 150, height: 210, transform: 'rotate(-5deg)', animation: 'floatIn 1s 1.1s ease-out forwards, drift1 10s ease-in-out 2.1s infinite' } },
          { cls: 'ad-5', src: '/samples/ad2.png', badge: 'Reels', style: { top: '35%', left: '2%', width: 130, height: 170, transform: 'rotate(2deg)', animation: 'floatIn 1s 0.4s ease-out forwards, drift2 8.5s ease-in-out 1.4s infinite' } },
          { cls: 'ad-6', src: '/samples/ad3.png', badge: 'Stories', style: { top: '38%', right: '3%', width: 140, height: 180, transform: 'rotate(-3deg)', animation: 'floatIn 1s 0.7s ease-out forwards, drift3 9.5s ease-in-out 1.7s infinite' } },
        ].map((ad) => (
          <div key={ad.cls} style={{
            position: 'absolute', borderRadius: '14px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
            pointerEvents: 'none', zIndex: 2, opacity: 0,
            border: '1px solid rgba(0,0,0,0.06)',
            ...ad.style,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.src} alt={ad.badge} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{
              position: 'absolute', bottom: 8, left: 8,
              fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '1.5px', background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)', color: 'var(--text)',
              padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.06)',
            }}>{ad.badge}</span>
          </div>
        ))}

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(64px, 12vw, 160px)',
          lineHeight: 0.92, letterSpacing: '-1px',
          color: 'var(--text)', position: 'relative', zIndex: 10,
        }}>
          <span style={{ color: 'var(--orange)' }}>RUN ADS.</span>
          <span style={{
            fontSize: '0.45em', color: 'var(--text)', letterSpacing: '2px',
            display: 'block', marginTop: '8px',
          }}>NOT HEADACHES.</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'clamp(13px, 1.4vw, 16px)',
          color: 'var(--text-light)', marginTop: '28px', letterSpacing: '1px',
          textTransform: 'uppercase', position: 'relative', zIndex: 10, maxWidth: '500px',
        }}>
          Enter your website. Set a budget. We handle everything else.
        </p>

        {/* Input Group */}
        <div style={{
          marginTop: '48px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '20px', position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '520px',
        }}>
          {/* URL Input */}
          <div style={{ width: '100%', position: 'relative' }}>
            <input
              id="urlInput"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%', padding: '18px 24px', background: 'var(--input-bg)',
                border: '1px solid var(--input-border)', color: 'var(--text)',
                fontFamily: 'var(--font-mono)', fontSize: '15px', outline: 'none',
                letterSpacing: '0.5px', caretColor: 'var(--orange)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            />
            {!userFocused && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', padding: '0 24px',
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

          {/* Budget Slider */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase',
              letterSpacing: '2px', color: 'var(--text-light)',
            }}>Daily Budget</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '42px',
              color: 'var(--orange)', letterSpacing: '2px', lineHeight: 1,
            }}>${budget}</span>
            <div style={{ width: '100%', position: 'relative', height: '48px', display: 'flex', alignItems: 'center' }}>
              <input
                type="range"
                min={5}
                max={500}
                step={5}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{
                  WebkitAppearance: 'none', appearance: 'none',
                  width: '100%', height: '4px', outline: 'none', cursor: 'pointer',
                  background: `linear-gradient(to right, var(--orange) 0%, var(--orange) ${sliderPercent}%, var(--slider-track) ${sliderPercent}%, var(--slider-track) 100%)`,
                }}
              />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', width: '100%',
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)',
              letterSpacing: '1px', marginTop: '-6px',
            }}>
              <span>$5/day</span>
              <span>$500/day</span>
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleLaunch}
            disabled={launching}
            style={{
              fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '3px',
              padding: '20px 64px', background: launching ? 'var(--green)' : 'var(--orange)',
              color: '#fff', border: 'none', cursor: launching ? 'wait' : 'pointer',
              textTransform: 'uppercase', transition: 'all 0.3s',
              boxShadow: '0 4px 24px rgba(255, 77, 0, 0.25)', marginTop: '8px',
              position: 'relative', zIndex: 10,
            }}
          >
            {launching ? '⚡ LAUNCHING...' : 'LAUNCH MY ADS'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 48px', borderTop: '1px solid rgba(0,0,0,0.06)',
        textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px',
        color: 'var(--text-muted)', letterSpacing: '1px',
      }}>
        &copy; 2026 StompAds. All rights reserved.
      </footer>

      {/* Slider thumb styles (can't do pseudo-elements inline) */}
      <style jsx global>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 28px; height: 28px;
          background: var(--orange); cursor: grab;
          border: 3px solid var(--bg);
          box-shadow: 0 0 0 2px var(--orange), 0 4px 16px rgba(255,77,0,0.25);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 0 2px var(--orange), 0 4px 24px rgba(255,77,0,0.4);
        }
        input[type="range"]::-moz-range-thumb {
          width: 28px; height: 28px;
          background: var(--orange); cursor: grab;
          border: 3px solid var(--bg);
          box-shadow: 0 0 0 2px var(--orange), 0 4px 16px rgba(255,77,0,0.25);
          border-radius: 0;
        }
        input[type="range"]::-moz-range-track {
          height: 4px; background: var(--slider-track); border: none;
        }
      `}</style>
    </>
  )
}
