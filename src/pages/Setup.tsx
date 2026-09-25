import { supabaseEnv } from '../lib/supabase'

function Row({ ok, name, problem }: { ok: boolean; name: string; problem: string }) {
  return (
    <li className="flex gap-3 items-start">
      <span className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-sm ${ok ? 'bg-green-600' : 'bg-blood'}`}>{ok ? '✓' : '×'}</span>
      <span>
        <code className="text-bone">{name}</code>
        {!ok && <span className="block text-sm text-mute">{problem}</span>}
      </span>
    </li>
  )
}

export default function Setup() {
  return (
    <div className="mx-auto max-w-md min-h-dvh p-6 flex flex-col justify-center gap-5">
      <h1 className="text-5xl font-bold text-blood">COLD BLOOD</h1>
      <p>The app isn't connected to its database yet.</p>
      <ul className="space-y-3">
        <Row
          ok={supabaseEnv.hasUrl && supabaseEnv.urlValid}
          name="VITE_SUPABASE_URL"
          problem={supabaseEnv.hasUrl ? 'Set, but not a valid URL. It should look like https://abcdefgh.supabase.co' : 'Not found in this build.'}
        />
        <Row ok={supabaseEnv.hasKey} name="VITE_SUPABASE_ANON_KEY" problem="Not found in this build." />
      </ul>
      <p className="text-mute text-sm">
        Add them in Netlify → Site configuration → Environment variables, then run a new deploy (Deploys → Trigger deploy → Deploy site).
        Values are built into the app, so they only take effect after a redeploy.
      </p>
    </div>
  )
}
