export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Stompads</h1>
          <p className="text-gray-400 mt-1">Run ads. Get traffic.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
