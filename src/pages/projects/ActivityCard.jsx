// What the project has collected and given out, newest first, with an undo for entries our organisation recorded.
import { deleteHandout, deleteReceipt } from '../../lib/api.js'
import { formatDay } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys, useHandouts, useReceipts } from '../../hooks/projects.js'
import { CardSkeletons } from '../../components/Skeleton.jsx'

export default function ActivityCard({ project }) {
  const collects = project.mode !== 'DISTRIBUTE'
  const receipts = useReceipts(project.projectId, collects)
  const handouts = useHandouts(project.projectId)
  const refresh = [
    projectKeys.receipts(project.projectId), projectKeys.handouts(project.projectId), projectKeys.stock(project.projectId), ['received'],
  ]
  const undoReceipt = useApiMutation((id) => deleteReceipt(id), { invalidate: refresh, success: 'Removed.' })
  const undoHandout = useApiMutation((id) => deleteHandout(id), { invalidate: refresh, success: 'Removed.' })

  const entries = [
    ...(collects ? receipts.data ?? [] : []).map((r) => ({
      id: r.receiptId, kind: 'in', day: r.receivedOn, title: r.stockItemName || r.description, quantity: r.quantity,
      line: `Received${r.donor ? ` from ${r.donor}` : ''} · ${r.organizationName}`,
      canDelete: r.canDelete, undo: () => undoReceipt.mutate(r.receiptId),
    })),
    ...(handouts.data?.entries ?? []).map((h) => ({
      id: h.handoutId, kind: 'out', day: h.handedOn, title: h.stockItemName || h.description, quantity: h.quantity,
      line: `Given${h.personName ? ` to ${h.personName}` : ''}${h.peopleCount ? ` · ${h.peopleCount} people` : ''} · ${h.organizationName}`,
      canDelete: h.canDelete, undo: () => undoHandout.mutate(h.handoutId),
    })),
  ].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))

  const loading = handouts.isPending || (collects && receipts.isPending)
  const hidden = handouts.data?.hiddenCount ?? 0
  return (
    <section className="card">
      <h2>Activity</h2>
      {loading && <CardSkeletons count={1} height={80} />}
      {(handouts.isError || receipts.isError) && <p className="message error">Could not load the activity.</p>}
      <ul className="mt">
        {entries.map((e) => (
          <li key={`${e.kind}-${e.id}`} className="list-row">
            <div className="grow">
              <strong>{e.title}{e.quantity ? ` × ${e.quantity}` : ''}</strong>
              <div className="meta">{formatDay(e.day)} · {e.line}</div>
            </div>
            {e.canDelete && <button type="button" className="link-btn danger" onClick={e.undo}>Undo</button>}
          </li>
        ))}
        {!loading && entries.length === 0 && <li className="muted">Nothing recorded yet.</li>}
      </ul>
      {hidden > 0 && <p className="muted small">{hidden} more handed to other organisations&apos; people who have not agreed to share their details.</p>}
    </section>
  )
}
