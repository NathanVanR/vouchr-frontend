import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateProject } from '../../lib/api.js'
import { PREREQUISITE_SERVICES, PROJECT_MODE_LABELS, serviceName } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys } from '../../hooks/projects.js'
import DateInput from '../../components/DateInput.jsx'
import Field from '../../components/Field.jsx'

/** Project settings (admins of the owning organisation only). */
export default function SettingsCard({ project }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(project.status)
  const [mode, setMode] = useState(project.mode || 'DISTRIBUTE')
  const [openHandout, setOpenHandout] = useState(!!project.openHandout)
  const [hidden, setHidden] = useState(!!project.hiddenFromArea)
  const [startsOn, setStartsOn] = useState(project.startsOn || '')
  const [endsOn, setEndsOn] = useState(project.endsOn || '')
  const [required, setRequired] = useState(project.requiredServiceType || '')

  // The short list of prerequisites; a project that already has another one keeps showing it.
  const prerequisites = { ...PREREQUISITE_SERVICES }
  if (project.requiredServiceType && !prerequisites[project.requiredServiceType]) {
    prerequisites[project.requiredServiceType] = serviceName(project.requiredServiceType)
  }

  const save = useApiMutation(
    () =>
      updateProject(project.projectId, {
        status,
        mode,
        openHandout: mode !== 'COLLECT' && openHandout,
        hiddenFromArea: hidden,
        ...(startsOn ? { startsOn } : { clearStartsOn: true }),
        ...(startsOn && endsOn ? { endsOn } : { clearEndsOn: true }),
        ...(required ? { requiredServiceType: required } : { clearRequiredService: true }),
      }),
    {
      invalidate: [projectKeys.list(project.organizationId), projectKeys.beneficiaries(project.projectId)],
      success: 'Settings saved.',
      onSuccess: (updated) => queryClient.setQueryData(projectKeys.one(project.projectId), updated),
    },
  )

  return (
    <section className="card">
      <h2>Project settings</h2>
      <div className="mt">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived (no new people can be added)</option>
          </select>
        </Field>
        <Field label="What does it do?">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            {Object.entries(PROJECT_MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        {mode !== 'COLLECT' && (
          <label className="check-row">
            <input type="checkbox" checked={openHandout} onChange={(e) => setOpenHandout(e.target.checked)} /> Open handout: record quantities and headcounts only, no names
          </label>
        )}
        <Field
          label="Must be receiving (optional)"
          hint="Shown as Met / Not met on each enrolled person. Met when the person (or their family) has this service on their care plan, from us or a partner, and is attending or has completed it."
        >
          <select value={required} onChange={(e) => setRequired(e.target.value)}>
            <option value="">No prerequisite</option>
            {Object.entries(prerequisites).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <div className="field-row">
          <Field label="Starts (optional)"><DateInput value={startsOn} onChange={setStartsOn} /></Field>
          <Field label="Ends (optional)" hint="Shown on the area calendar."><DateInput value={endsOn} min={startsOn || undefined} onChange={setEndsOn} /></Field>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Keep out of the area view (other organisations cannot see it or ask to join)
        </label>
        <button type="button" className="btn" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  )
}
