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
    if (!url.trim()) {
      document.getElementById('urlInput')?.focus()
      return
    }
    setLaunching(true)
    router.push('/signup')
  }

  const sliderPercent = ((budget - 5) / (500 - 5)) * 100

  return (
    <>
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
        <span />
      </nav>

      {/* Hero — everything fits in 100vh */}
      <section style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        position: 'relative', padding: '80px 24px 40px', overflow: 'hidden',
      }}>

        {/* Floating Ad Cards — real images + video around the hero */}
        {[
          { src: '/samples/ad1.png', badge: 'Instagram', isVideo: false, cls: '', style: { top: '8%', left: '3%', width: 140, height: 180, transform: 'rotate(-6deg)', animation: 'floatIn 1s 0.2s ease-out forwards, drift1 8s ease-in-out 1.2s infinite' } },
          { src: '/samples/ad4.png', badge: 'TikTok', isVideo: false, cls: '', style: { top: '5%', right: '3%', width: 120, height: 210, transform: 'rotate(4deg)', animation: 'floatIn 1s 0.5s ease-out forwards, drift2 9s ease-in-out 1.5s infinite' } },
          { src: '/samples/ad5.png', badge: 'Facebook', isVideo: false, cls: '', style: { bottom: '18%', left: '2%', width: 150, height: 150, transform: 'rotate(3deg)', animation: 'floatIn 1s 0.8s ease-out forwards, drift3 7s ease-in-out 1.8s infinite' } },
          { src: '/samples/ugc-video.mp4', badge: 'Reels', isVideo: true, cls: '', style: { bottom: '10%', right: '3%', width: 130, height: 185, transform: 'rotate(-5deg)', animation: 'floatIn 1s 1.1s ease-out forwards, drift4 10s ease-in-out 2.1s infinite' } },
          { src: '/samples/ad2.png', badge: 'YouTube', isVideo: false, cls: 'hide-mobile', style: { top: '38%', left: '0%', width: 110, height: 145, transform: 'rotate(2deg)', animation: 'floatIn 1s 0.4s ease-out forwards, drift2 8.5s ease-in-out 1.4s infinite' } },
          { src: '/samples/ad3.png', badge: 'Stories', isVideo: false, cls: 'hide-mobile', style: { top: '35%', right: '0%', width: 115, height: 155, transform: 'rotate(-3deg)', animation: 'floatIn 1s 0.7s ease-out forwards, drift3 9.5s ease-in-out 1.7s infinite' } },
        ].map((ad, i) => (
          <div key={i} className={`floating-ad ${ad.cls}`} style={{
            position: 'absolute', borderRadius: '14px', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
            pointerEvents: 'none', zIndex: 2, opacity: 0,
            border: '1px solid rgba(0,0,0,0.06)',
            ...ad.style,
          }}>
            {ad.isVideo ? (
              <video src={ad.src} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.src} alt={ad.badge} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            {/* Play icon overlay for video */}
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
              letterSpacing: '1.5px', background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)', color: 'var(--text)',
              padding: '3px 8px', borderRadius: '3px', border: '1px solid rgba(0,0,0,0.06)',
            }}>{ad.badge}</span>
          </div>
        ))}

        {/* Headline — compact */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(56px, 10vw, 130px)',
          lineHeight: 0.92, letterSpacing: '-1px',
          color: 'var(--text)', position: 'relative', zIndex: 10,
          margin: 0,
        }}>
          <span style={{ color: 'var(--orange)' }}>RUN ADS.</span>
          <span style={{
            fontSize: '0.45em', color: 'var(--text)', letterSpacing: '2px',
            display: 'block', marginTop: '4px',
          }}>NOT HEADACHES.</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 'clamp(11px, 1.2vw, 14px)',
          color: 'var(--text-light)', marginTop: '20px', letterSpacing: '1px',
          textTransform: 'uppercase', position: 'relative', zIndex: 10, maxWidth: '460px',
        }}>
          Enter your website. Set a budget. We handle everything else.
        </p>

        {/* Input Group — tighter spacing */}
        <div style={{
          marginTop: '28px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '14px', position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '480px',
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
                width: '100%', padding: '14px 20px', background: 'var(--input-bg)',
                border: '1px solid var(--input-border)', color: 'var(--text)',
                fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none',
                letterSpacing: '0.5px', caretColor: 'var(--orange)',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
            />
            {!userFocused && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', padding: '0 20px',
                pointerEvents: 'none', fontFamily: 'var(--font-mono)',
                fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '0.5px',
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
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '2px', color: 'var(--text-light)',
            }}>Daily Budget</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '36px',
              color: 'var(--orange)', letterSpacing: '2px', lineHeight: 1,
            }}>${budget}</span>
            <div style={{ width: '100%', position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
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
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
              letterSpacing: '1px', marginTop: '-4px',
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
              fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '3px',
              padding: '16px 56px', background: launching ? 'var(--green)' : 'var(--orange)',
              color: '#fff', border: 'none', cursor: launching ? 'wait' : 'pointer',
              textTransform: 'uppercase', transition: 'all 0.3s',
              boxShadow: '0 4px 24px rgba(255, 77, 0, 0.25)', marginTop: '4px',
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
    </>
  )
}
