import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="px-8 py-5 flex justify-between items-center">
        <span className="text-xl font-bold tracking-tight">stompads</span>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="text-gray-400 hover:text-white text-sm transition">Log in</Link>
          <Link href="/signup" className="bg-white text-black text-sm font-semibold px-5 py-2 rounded-full hover:bg-gray-200 transition">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-8 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-gray-700 text-xs text-gray-400 uppercase tracking-widest">
          Ads on autopilot
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">
          Enter your URL.<br />
          <span className="text-gray-500">We run your ads.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mt-6">
          Stompads generates AI-powered UGC video and image ads, launches them on Meta, and gets you traffic. No ad account. No creative team. No work.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/signup" className="bg-white text-black font-bold px-8 py-4 rounded-full text-lg hover:bg-gray-200 transition">
            Start now — it&apos;s free to try
          </Link>
        </div>
      </section>

      {/* Sample Ads Showcase */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <p className="text-center text-sm text-gray-500 uppercase tracking-widest mb-8">AI-generated ads, ready in minutes</p>
        <div className="flex justify-center gap-6 overflow-hidden">
          {['/samples/ad1.png', '/samples/ad2.png', '/samples/ad3.png'].map((src, i) => (
            <div key={i} className="relative w-[220px] flex-shrink-0 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-blue-500/5 hover:scale-105 transition duration-300">
              <Image
                src={src}
                alt={`Sample AI-generated ad ${i + 1}`}
                width={220}
                height={390}
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Three steps. That&apos;s it.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Paste your URL', desc: 'We scrape your site, understand your product, and build a brand profile in seconds.' },
            { step: '2', title: 'Preview your ads', desc: 'AI generates UGC-style video and image ads. You see them before paying anything.' },
            { step: '3', title: 'Set budget & go', desc: 'Pick a daily budget, hit go. We launch on Meta and show you live results.' },
          ].map(item => (
            <div key={item.step} className="bg-gray-950 border border-gray-800 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-white text-black font-bold flex items-center justify-center text-lg mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What you get</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            'AI video ads',
            'AI image ads',
            'Auto targeting',
            'Live metrics',
            'No ad account needed',
            'No creative team',
            'Meta Ads included',
            'Budget control',
          ].map(item => (
            <div key={item} className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-5 text-center">
              <p className="text-sm font-medium">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-8 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to get traffic?</h2>
        <p className="text-gray-400 text-lg mb-8">Enter your URL and see your first ads in under 2 minutes.</p>
        <Link href="/signup" className="bg-white text-black font-bold px-8 py-4 rounded-full text-lg hover:bg-gray-200 transition">
          Get started free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 px-8 py-6 text-center text-gray-600 text-xs">
        &copy; {new Date().getFullYear()} Stompads. Ads on autopilot.
      </footer>
    </div>
  )
}
