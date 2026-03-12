import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="px-8 py-6 flex justify-between items-center border-b border-gray-900">
        <span className="text-xl font-bold">Stompads</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white text-sm">Log in</Link>
          <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Get started
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-24 text-center space-y-8">
        <h1 className="text-6xl font-bold leading-tight">
          Enter URL.<br />Get traffic.
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Stompads generates AI-powered video and image ads for your product and runs them on Meta — automatically. No ad account needed.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition">
            Start for free →
          </Link>
        </div>

        <div className="pt-16 grid grid-cols-3 gap-8 text-left">
          {[
            { title: 'Enter your URL', desc: 'We scrape your site and understand your product instantly.' },
            { title: 'We generate your ads', desc: 'AI-generated UGC video and image ads tailored to your brand.' },
            { title: 'Sit back and watch', desc: 'We run ads on Meta, optimize automatically, and show you results.' },
          ].map(item => (
            <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
