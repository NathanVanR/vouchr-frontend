// Optional counts for a project: what it keeps track of (e.g. "Reading glasses"), an optional target, and how many have been
// received, given out and are on hand. A project that does not want counts simply has no items.
import { useState } from 'react'
import { addStockItem } from '../../lib/api.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys, useStockItems } from '../../hooks/projects.js'
import Field from '../../components/Field.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'

function AddItem({ project }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const add = useApiMutation(
    () => addStockItem(project.projectId, { name: name.trim(), targetQuantity: target ? Number(target) : null }),
    {
      invalidate: [projectKeys.stock(project.projectId)],
      success: 'Item added.',
      onSuccess: () => { setName(''); setTarget('') },
    },
  )
  return (
    <form className="mt" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
      <Field label="Track a new item (optional)">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Reading glasses" required />
      </Field>
      <Field label="Target (optional)">
        <input type="number" min="1" max="1000000" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 200" />
      </Field>
      <button type="submit" className="btn btn-sm" disabled={add.isPending || !name.trim()}>
        {add.isPending ? 'Adding…' : 'Add item'}
      </button>
    </form>
  )
}

export default function StockCard({ project }) {
  const items = useStockItems(project.projectId)
  const collects = project.mode !== 'DISTRIBUTE'
  const list = items.data ?? []
  if (items.isSuccess && list.length === 0 && !project.canAdmin) return null

  return (
    <section className="card">
      <h2>Counts</h2>
      <p className="muted">
        Optional. Track how many of a particular item {collects ? 'have come in, been given out and are left' : 'have been given out'}.
        You can also record things without tracking counts.
      </p>
      {items.isPending && <CardSkeletons count={1} height={80} />}
      {items.isError && <p className="message error">{items.error.message || 'Could not load counts.'}</p>}
      <ul className="mt">
        {list.map((i) => {
          const done = collects ? i.received : i.given
          const pct = i.targetQuantity ? Math.min(100, Math.round((done / i.targetQuantity) * 100)) : null
          return (
            <li key={i.stockItemId} className="list-row">
              <div className="grow">
                <strong>{i.name}</strong>
                <div className="meta">
                  {collects ? `${i.received} received · ` : ''}{i.given} given{collects ? ` · ${i.onHand} on hand` : ''}
                  {i.targetQuantity ? ` · target ${i.targetQuantity}` : ''}
                </div>
                {pct !== null && <progress value={pct} max="100" aria-label={`${pct}% of target`} style={{ width: '100%' }} />}
              </div>
            </li>
          )
        })}
        {items.isSuccess && list.length === 0 && <li className="muted">No items are being counted.</li>}
      </ul>
      {project.canAdmin && <AddItem project={project} />}
    </section>
  )
}
