import { exitDemoMode } from '../lib/demo.js'

export default function DemoBanner() {
  return (
    <div className="demo-banner">
      <span>
        <strong>Demo mode</strong> · sample data only, nothing is saved.
      </span>
      <button type="button" onClick={exitDemoMode}>
        Exit demo
      </button>
    </div>
  )
}
