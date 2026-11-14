import { useState } from 'react'
import { createProject } from '../../lib/api.js'
import { PREREQUISITE_SERVICES, PROJECT_MODE_LABELS, PROJECT_TYPE_LABELS } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys } from '../../hooks/projects.js'
import DateInput from '../../components/DateInput.jsx'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'

/** Admin-only form to add a project to the active organisation. */
export default function NewProjectSheet({ orgId, onClose }) {
  const [form, setForm] = useState({
    name: '', projectType: 'FEEDING_SCHEME', typeLabel: '', description: '', requiredServiceType: '', requirementEnforcement: 'WARN',
    mode: 'DISTRIBUTE', openHandout: false, hiddenFromArea: false, startsOn: '', endsOn: '',
  })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const create = useApiMutation((payload) => createProject(orgId, payload), {
    invalidate: [projectKeys.list(orgId)],
    success: 'Project added.',
    onSuccess: onClose,
  })

  function submit(e) {
    e.preventDefault()
    create.mutate({
      name: form.name.trim(),
      projectType: form.projectType,
      typeLabel: form.projectType === 'OTHER' ? form.typeLabel.trim() || null : null,
      description: form.description.trim() || null,
      requiredServiceType: form.requiredServiceType || null,
      requirementEnforcement: form.requirementEnforcement,
      mode: form.mode,
      hiddenFromArea: form.hiddenFromArea,
      startsOn: form.startsOn || null,
      endsOn: form.startsOn ? form.endsOn || null : null,
      openHandout: form.mode !== 'COLLECT' && form.openHandout,
    })
  }

  return (
    <Sheet title="Add a project" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Project name">
          <input value={form.name} onChange={set('name')} maxLength={255} placeholder="e.g. Winter feeding scheme" required autoFocus />
        </Field>
        <Field label="Type">
          <select value={form.projectType} onChange={set('projectType')} required>
            {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        {form.projectType === 'OTHER' && (
          <Field label="What kind of project is it?">
            <input value={form.typeLabel} onChange={set('typeLabel')} maxLength={100} placeholder="e.g. Winter blanket drive" />
          </Field>
        )}
        <Field label="What does it do?">
          <select value={form.mode} onChange={set('mode')}>
            {Object.entries(PROJECT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        {form.mode !== 'COLLECT' && (
          <label className="check-row">
            <input type="checkbox" checked={form.openHandout} onChange={(e) => setForm({ ...form, openHandout: e.target.checked })} /> Open handout: record quantities and headcounts only, no names
          </label>
        )}
        <div className="field-row">
          <Field label="Starts (optional)"><DateInput value={form.startsOn} onChange={(startsOn) => setForm({ ...form, startsOn })} /></Field>
          <Field label="Ends (optional)" hint="Shown on the area calendar."><DateInput value={form.endsOn} min={form.startsOn || undefined} onChange={(endsOn) => setForm({ ...form, endsOn })} /></Field>
        </div>
        <Field label="Description (optional)">
          <input value={form.description} onChange={set('description')} maxLength={1000} />
        </Field>
        {!form.openHandout && (
        <Field label="Must be receiving (optional)" hint="A service people need to be receiving before they take part.">
          <select value={form.requiredServiceType} onChange={set('requiredServiceType')}>
            <option value="">No prerequisite</option>
            {Object.entries(PREREQUISITE_SERVICES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        )}
        <label className="check-row">
          <input type="checkbox" checked={form.hiddenFromArea} onChange={(e) => setForm({ ...form, hiddenFromArea: e.target.checked })} />
          Keep out of the area view (other organisations cannot see it or ask to join)
        </label>
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add project'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
