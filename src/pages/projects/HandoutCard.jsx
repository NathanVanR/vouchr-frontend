// Record something the project gave out. On an open-handout project this is a quantity and a headcount only; otherwise it is
// handed to an enrolled person of the organisation recording it.
import { useState } from 'react'
import { addHandout } from '../../lib/api.js'
import { todayIso } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys, useStockItems } from '../../hooks/projects.js'
import Field from '../../components/Field.jsx'

export default function HandoutCard({ project, enrolOrgId, enrolled }) {
  const items = useStockItems(project.projectId)
  const open = project.openHandout
  const [personId, setPersonId] = useState('')
  const [stockItemId, setStockItemId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [peopleCount, setPeopleCount] = useState('')
  const [handedOn, setHandedOn] = useState(todayIso())

  // people we can hand something to: enrolled, ours
  const people = enrolled.filter((b) => b.organizationId === enrolOrgId)

  const add = useApiMutation(
    () => addHandout(project.projectId, {
      organizationId: enrolOrgId,
      personId: open ? null : personId,
      stockItemId: stockItemId || null,
      quantity: quantity ? Number(quantity) : 1,
      description: description.trim() || null,
      peopleCount: open && peopleCount ? Number(peopleCount) : null,
      handedOn,
    }),
    {
      invalidate: [projectKeys.handouts(project.projectId), projectKeys.stock(project.projectId), ['received']],
      success: 'Recorded.',
      onSuccess: () => { setDescription(''); setQuantity('1'); setPeopleCount(''); setPersonId('') },
    },
  )

  const list = items.data ?? []
  return (
    <section className="card">
      <h2>{open ? 'Record a handout' : 'Record a handover'}</h2>
      {open && <p className="muted">No names are recorded for this project: just what was given out and how many people it reached.</p>}
      <form className="mt" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
        {!open && (
          <Field label="Who received it?" hint={people.length === 0 ? 'Enrol someone below first.' : undefined}>
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} required>
              <option value="">Choose a person</option>
              {people.map((b) => <option key={b.personId} value={b.personId}>{b.name} {b.surname}</option>)}
            </select>
          </Field>
        )}
        {list.length > 0 && (
          <Field label="Item (optional)">
            <select value={stockItemId} onChange={(e) => setStockItemId(e.target.value)}>
              <option value="">Not one of the counted items</option>
              {list.map((i) => (
                <option key={i.stockItemId} value={i.stockItemId}>
                  {i.name}{project.mode === 'BOTH' ? ` (${i.onHand} on hand)` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!stockItemId && (
          <Field label="What was given?">
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} placeholder="e.g. Food parcel" required />
          </Field>
        )}
        <Field label="Quantity">
          <input type="number" min="1" max="1000000" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </Field>
        {open && (
          <Field label="People reached (optional)">
            <input type="number" min="1" max="1000000" value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} />
          </Field>
        )}
        <Field label="Date">
          <input type="date" value={handedOn} max={todayIso()} onChange={(e) => setHandedOn(e.target.value)} required />
        </Field>
        <button type="submit" className="btn" disabled={add.isPending}>{add.isPending ? 'Saving…' : 'Record'}</button>
      </form>
    </section>
  )
}
