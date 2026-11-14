// Record something the project collected (a donation received by one of the organisations taking part).
import { useState } from 'react'
import { addReceipt } from '../../lib/api.js'
import { todayIso } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys, useStockItems } from '../../hooks/projects.js'
import Field from '../../components/Field.jsx'

export default function ReceiveCard({ project, enrolOrgId }) {
  const items = useStockItems(project.projectId)
  const [stockItemId, setStockItemId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [donor, setDonor] = useState('')
  const [receivedOn, setReceivedOn] = useState(todayIso())

  const add = useApiMutation(
    () => addReceipt(project.projectId, {
      organizationId: enrolOrgId,
      stockItemId: stockItemId || null,
      quantity: quantity ? Number(quantity) : null,
      description: description.trim() || null,
      donor: donor.trim() || null,
      receivedOn,
    }),
    {
      invalidate: [projectKeys.receipts(project.projectId), projectKeys.stock(project.projectId)],
      success: 'Recorded.',
      onSuccess: () => { setDescription(''); setQuantity(''); setDonor('') },
    },
  )

  const list = items.data ?? []
  return (
    <section className="card">
      <h2>Record a donation</h2>
      <form className="mt" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        {list.length > 0 && (
          <Field label="Item (optional)">
            <select value={stockItemId} onChange={(e) => setStockItemId(e.target.value)}>
              <option value="">Not one of the counted items</option>
              {list.map((i) => <option key={i.stockItemId} value={i.stockItemId}>{i.name}</option>)}
            </select>
          </Field>
        )}
        {!stockItemId && (
          <Field label="What was it?">
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} placeholder="e.g. Kitchen items from an estate" required />
          </Field>
        )}
        <Field label={stockItemId ? 'How many?' : 'How many? (optional)'}>
          <input type="number" min="1" max="1000000" value={quantity} onChange={(e) => setQuantity(e.target.value)} required={!!stockItemId} />
        </Field>
        <Field label="From (optional)" hint="Free text. Leave blank if you do not need to record who gave it.">
          <input value={donor} onChange={(e) => setDonor(e.target.value)} maxLength={150} />
        </Field>
        <Field label="Date">
          <input type="date" value={receivedOn} max={todayIso()} onChange={(e) => setReceivedOn(e.target.value)} required />
        </Field>
        <button type="submit" className="btn" disabled={add.isPending}>{add.isPending ? 'Saving…' : 'Record donation'}</button>
      </form>
    </section>
  )
}
