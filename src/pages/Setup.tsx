export default function Setup() {
  return (
    <div className="mx-auto max-w-md min-h-dvh p-6 flex flex-col justify-center gap-4">
      <h1 className="text-5xl font-bold text-blood">COLD BLOOD</h1>
      <p>The app isn't connected to its database yet.</p>
      <p className="text-mute text-sm">
        Set <code className="text-bone">VITE_SUPABASE_URL</code> and <code className="text-bone">VITE_SUPABASE_ANON_KEY</code> in
        Netlify (Site configuration → Environment variables) or in <code className="text-bone">.env.local</code> for local
        development, then rebuild. See README.md.
      </p>
    </div>
  )
}
