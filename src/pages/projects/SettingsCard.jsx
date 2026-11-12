import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateProject } from '../../lib/api.js'
import { PREREQUISITE_SERVICES, serviceName } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys } from '../../hooks/projects.js'
import Field from '../../components/Field.jsx'

/** Project settings (admins of the owning organisation only). */
export default function SettingsCard({ project }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState(project.status)
  const [required, setRequired] = useState(project.requiredServiceType || '')
  const [enforcement, setEnforcement] = useState(project.requirementEnforcement || 'WARN')

  // The short list of prerequisites; a project that already has another one keeps showing it.
  const prerequisites = { ...PREREQUISITE_SERVICES }
  if (project.requiredServiceType && !prerequisites[project.requiredServiceType]) {
    prerequisites[project.requiredServiceType] = serviceName(project.requiredServiceType)
  }

  const save = useApiMutation(
    () =>
      updateProject(project.projectId, {
        status,
        requirementEnforcement: enforcement,
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
        <Field
          label="Must be receiving before aid is given"
          hint="Checked when aid is given. Met when the person (or their family) has this service on their care plan, from us or a partner, and is attending or has completed it."
        >
          <select value={required} onChange={(e) => setRequired(e.target.value)}>
            <option value="">No prerequisite</option>
            {Object.entries(prerequisites).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        {required && (
          <Field label="If they are not">
            <select value={enforcement} onChange={(e) => setEnforcement(e.target.value)}>
              <option value="WARN">Staff may continue with a reason</option>
              <option value="BLOCK">Do not allow aid</option>
            </select>
          </Field>
        )}
        <button type="button" className="btn" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  )
}
