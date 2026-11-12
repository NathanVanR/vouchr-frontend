// Staff-only witnessed consent, on one device. People are added separately (PersonSheet):
//   1. who signs (always a registered adult) and which children in their family are covered
//   2. the signer reads the contract, makes the optional choices
//   3. the signer signs (this is also where the one required clause is agreed)
//   4. the staff member confirms they witnessed it
import { useRef, useState } from 'react'
import { signConsent } from '../../lib/api.js'
import { openConsentPdf } from '../../lib/consentPdf.js'
import { fullName, todayIso } from '../../lib/format.js'
import { AGE_OF_MAJORITY, ageOn, dateOfBirthMatchesId, dobFromId, isValidSaId } from '../../lib/validation.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { peopleKey, useConsentForm, usePerson } from '../../hooks/people.js'
import { useToast } from '../../toast/useToast.js'
import Field from '../../components/Field.jsx'
import MemberPicker from '../../components/MemberPicker.jsx'
import Sheet from '../../components/Sheet.jsx'
import SignaturePad from '../../components/SignaturePad.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

const OPTIONAL_TYPES = ['PARTNER_SHARING', 'REFERRALS', 'SPECIAL_INFORMATION', 'ANONYMISED_RESEARCH']
const TITLES = { who: 'Who signs?', read: 'Please read', sign: 'Sign', witness: 'Staff witness' }
const STEP_NUMBER = { who: 1, read: 2, sign: 3, witness: 4 }

// The clauses the person must agree to. They are agreed by signing, under the statement shown above the signature.
const requiredClauses = (form) => form.clauses.filter((c) => c.mandatory && c.type !== 'ANONYMISED_RESEARCH')

function Progress({ step }) {
  return (
    <>
      <div className="wizard-steps" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <i key={n} className={n <= STEP_NUMBER[step] ? 'on' : ''} />)}
      </div>
      <h3 style={{ marginBottom: 10 }}>Step {STEP_NUMBER[step]} of 4 — {TITLES[step]}</h3>
    </>
  )
}

function Flow({ orgId, people, signerPersonId, coverPersonIds, onDone, onClose }) {
  const toast = useToast()
  // The signer is always a registered adult. A child can only be covered by an adult in the child's own family.
  const adults = people.filter((p) => p.ageGroup !== 'CHILD') // adults (and people whose age is not known yet)
  const forChild = !signerPersonId && coverPersonIds.length > 0
  const firstChild = people.find((p) => coverPersonIds.includes(p.personId))
  // who can sign: the chosen adult, or (opened for a child) the adults in that child's family
  const signers = forChild
    ? adults.filter((p) => firstChild?.familyId && p.familyId === firstChild.familyId)
    : adults.filter((p) => p.personId === signerPersonId)

  const [step, setStep] = useState('who')
  const [error, setError] = useState('')
  const [signerId, setSignerId] = useState(signers[0]?.personId || null)
  const [extra, setExtra] = useState({}) // what staff typed for the signer's ID number / date of birth (undefined = untouched)
  const [covered, setCovered] = useState(() => {
    // pre-ticked children must be coverable for the first signer
    const signer = signers[0]
    return coverPersonIds.filter((id) => {
      const c = people.find((p) => p.personId === id)
      return c && c.ageGroup === 'CHILD' && c.consentStatus !== 'VALID' && c.familyId && signer?.familyId && c.familyId === signer.familyId
    })
  })
  const [acks, setAcks] = useState({})
  const [relationship, setRelationship] = useState('PARENT')
  const [signature, setSignature] = useState(null)
  const [witnessed, setWitnessed] = useState(false)
  const [result, setResult] = useState(null)
  const padRef = useRef(null)

  const signer = people.find((p) => p.personId === signerId) || null
  const signerFamilyId = signer?.familyId || null
  // a child can be covered only when they are in the signer's family and still need a consent
  const coverable = people.filter(
    (p) => p.ageGroup === 'CHILD' && p.consentStatus !== 'VALID' && !!p.familyId && p.personId !== signerId && signerFamilyId && p.familyId === signerFamilyId,
  )
  const coveredIds = covered.filter((id) => coverable.some((p) => p.personId === id))
  const kids = coveredIds.length
  /** A registered signer without a valid consent signs for themselves too. */
  const signsForSelf = !!signer && signer.consentStatus !== 'VALID'
  const signerName = signer ? fullName(signer) : ''

  const formQuery = useConsentForm(orgId, step !== 'who')
  const form = formQuery.data

  const sign = useApiMutation((payload) => signConsent(orgId, payload), {
    invalidate: [peopleKey(orgId), ['families', orgId]],
    quiet: true,
  })

  // The ID number is not in the people list, so it comes from the person's own record (only needed when one is on file).
  const detail = usePerson(signer?.hasIdNumber ? signerId : null)
  const detailLoading = !!signer?.hasIdNumber && detail.isLoading
  // What staff typed wins; until then the fields show the record. The date follows a changed ID until it is edited itself.
  const idValue = extra.idNumber ?? detail.data?.idNumber ?? ''
  const dobFromTypedId = extra.idNumber !== undefined ? dobFromId(idValue) : ''
  const dobValue = extra.dob ?? (dobFromTypedId || signer?.dateOfBirth || dobFromId(idValue))

  function validateWho() {
    if (!signer) return 'Choose the person who is signing.'
    if (detailLoading) return 'Loading the details on file. Try again in a moment.'
    if (!idValue && signer.hasIdNumber) {
      // an ID is on file but was not returned (e.g. demo data): keep it and only check the date
      if (!dobValue) return 'Enter the date of birth.'
    } else {
      if (!isValidSaId(idValue)) return 'Enter a valid 13-digit South African ID number.'
      if (!dobValue) return 'Enter the date of birth.'
      if (!dateOfBirthMatchesId(dobValue, idValue)) return 'The date of birth does not match the ID number.'
    }
    const dob = dobValue
    if (dob > todayIso()) return 'The date of birth cannot be in the future.'
    if (ageOn(dob) < AGE_OF_MAJORITY) return 'The person signing must be 18 or older.'
    if (!signsForSelf && !kids) {
      return 'This person already has a consent. To add children, tick at least one child in their family. Other adults sign their own consent.'
    }
    return ''
  }

  function go(next) {
    setError('')
    setStep(next)
  }

  function buildPayload() {
    // answers for every clause that takes one (read-only text takes none); unticked means no
    const acknowledgements = {}
    for (const c of form.clauses) if (c.type !== 'INFORMATION') acknowledgements[c.id] = !!acks[c.id]
    // the required agreement is made by signing, under the statement shown above the signature pad
    for (const c of requiredClauses(form)) acknowledgements[c.id] = true
    return {
      formVersionId: form.formVersionId,
      // the backend saves these onto the person's record (replacing what was there) once it has validated them
      signer: { personId: signerId, dateOfBirth: dobValue || null, idNumber: idValue || null },
      coveredPersonIds: coveredIds,
      relationshipToDependents: kids ? relationship : null,
      acknowledgements,
      signaturePng: signature,
      witnessConfirmed: true,
    }
  }

  async function submit() {
    setError('')
    try {
      const saved = await sign.mutateAsync(buildPayload())
      setResult(saved)
      onDone(saved)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not save the consent')
    }
  }

  // ---------- finished ----------
  if (result) {
    const count = (result.personIds || []).length
    return (
      <>
        <p>The signed consent has been recorded and a sealed copy has been stored. It covers {count === 1 ? '1 person' : `${count} people`}.</p>
        <div className="sheet-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => { const problem = await openConsentPdf(result.consentId); if (problem) toast(problem, 'error') }}
          >
            View signed copy (PDF)
          </button>
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </>
    )
  }

  // ---------- step 1: who signs, and who is covered ----------
  if (step === 'who') {
    if (!signers.length) {
      // opened for a child who has no family, or whose family has no registered adult
      return (
        <>
          <Progress step="who" />
          <p>A child is covered by the consent of a registered parent or legal guardian in the same family.</p>
          <p className="muted mt">
            Add the parent or guardian as a person, give them a consent, and put them and the child in the same family on the Families tab first.
          </p>
        </>
      )
    }
    return (
      <>
        <Progress step="who" />
        {forChild ? (
          <p className="muted">A child is covered by the consent of a registered parent or legal guardian in the same family.</p>
        ) : (
          <p className="muted">
            <strong>{signerName}</strong> signs for themselves. A parent or legal guardian&apos;s signature can also cover children under 18 in their family.
          </p>
        )}

        {forChild && signers.length > 1 && (
          <div className="mt">
            <Field label="Who is signing?">
              <select value={signerId || ''} onChange={(e) => { setSignerId(e.target.value); setExtra({}); setCovered(covered.filter((id) => id !== e.target.value)) }}>
                {signers.map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {fullName(p)}{p.consentStatus === 'VALID' ? ' (has a consent: add children)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {forChild && signers.length === 1 && <p className="mt"><strong>Signer:</strong> {signerName}</p>}

        {signer && detailLoading && <Skeleton height={44} />}
        {signer && !detailLoading && (
          <>
            <Field label="South African ID number">
              <input inputMode="numeric" maxLength={13} value={idValue} onChange={(e) => setExtra({ ...extra, idNumber: e.target.value.trim() })} />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={dobValue} max={todayIso()} onChange={(e) => setExtra({ ...extra, dob: e.target.value })} />
            </Field>
            <p className="muted small" style={{ margin: '-4px 0 10px' }}>
              Saved to {fullName(signer)}'s record when they sign. The date follows the ID number; both can be corrected here.
            </p>
          </>
        )}

        <h3 className="mt">Children covered by this signature</h3>
        <p className="muted small" style={{ margin: '4px 0 10px' }}>Children in the same family as the signer who still need a consent. Add as many as needed.</p>
        <MemberPicker
          candidates={coverable}
          selected={coveredIds}
          onChange={setCovered}
          emptyText={signerFamilyId
            ? 'No children in this family are waiting for a consent.'
            : 'This person is not in a family yet, so there are no children to cover. Add them to a family on the Families tab.'}
          placeholder="Search children by name or school…"
        />
        {error && <p className="message error mt" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn" onClick={() => { const problem = validateWho(); if (problem) setError(problem); else go('read') }}>
            Next
          </button>
        </div>
      </>
    )
  }

  // ---------- step 2: read the contract, choose ----------
  if (step === 'read') {
    if (formQuery.isPending) return <><Progress step="read" /><Skeleton height={160} /></>
    if (formQuery.isError) {
      return (
        <>
          <Progress step="read" />
          <p className="message error">{formQuery.error.message || 'Could not load the consent form'}</p>
          <div className="sheet-actions"><button type="button" className="btn btn-ghost" onClick={() => go('who')}>Back</button></div>
        </>
      )
    }
    return <ReadStep form={form} acks={acks} setAcks={setAcks} onBack={() => go('who')} onNext={() => go('sign')} />
  }

  // ---------- step 3: sign ----------
  if (step === 'sign') {
    return (
      <>
        <Progress step="sign" />
        <p><strong>{signerName}</strong>, please sign below.</p>
        {kids > 0 && (
          <div className="mt">
            <Field label={`Your relationship to the ${kids === 1 ? 'child' : 'children'} covered by your signature`}>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                <option value="PARENT">Parent</option>
                <option value="LEGAL_GUARDIAN">Legal guardian</option>
              </select>
            </Field>
          </div>
        )}
        <div className="message warn mt" style={{ fontWeight: 500 }}>
          <p><strong>By signing below, I confirm that:</strong></p>
          <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
            {requiredClauses(form).map((c) => <li key={c.id}>{c.checkboxLabel || 'I have read this document and I agree to it.'}</li>)}
          </ul>
        </div>
        <p className="label mt">Signature: sign with your finger or a mouse</p>
        <SignaturePad ref={padRef} />
        <button type="button" className="link-btn" onClick={() => padRef.current?.clear()}>Clear signature</button>
        {error && <p className="message error mt" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={() => go('read')}>Back</button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (padRef.current.isEmpty()) return setError('Please sign in the box.')
              setSignature(padRef.current.toDataUrl())
              go('witness')
              return undefined
            }}
          >
            Next
          </button>
        </div>
      </>
    )
  }

  // ---------- step 4: the staff member witnesses and submits ----------
  const childText = `${kids} ${kids === 1 ? 'child' : 'children'}`
  return (
    <>
      <Progress step="witness" />
      <p><strong>Hand the device back to the staff member.</strong></p>
      <p className="mt">
        {signerName} is signing {signsForSelf ? 'for themselves' : ''}{signsForSelf && kids ? ' and ' : ''}{kids ? `for ${childText}` : ''}.
      </p>
      <img src={signature} alt="Signature" className="signature-preview mt" />
      <label className="check-row mt" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" checked={witnessed} onChange={(e) => setWitnessed(e.target.checked)} />
        <span style={{ fontWeight: 500 }}>
          I am the staff member logged in on this device, and I watched this person read the consent and sign it
          {kids ? ', and I have checked that they are the parent or legal guardian of the children covered' : ''}.
        </span>
      </label>
      {error && <p className="message error mt" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-ghost" onClick={() => go('sign')}>Back</button>
        <button type="button" className="btn" disabled={!witnessed || sign.isPending} onClick={submit}>
          {sign.isPending ? 'Saving…' : 'Save signed consent'}
        </button>
      </div>
    </>
  )
}

function ReadStep({ form, acks, setAcks, onBack, onNext }) {
  const [atEnd, setAtEnd] = useState(false)
  const isOptional = (c) => OPTIONAL_TYPES.includes(c.type)
  const reading = form.clauses.filter((c) => !isOptional(c)) // read in the scroll box
  const choices = form.clauses.filter(isOptional) // switched on or off, default NO

  const check = (el) => setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 4)

  return (
    <>
      <Progress step="read" />
      <p className="message warn">
        <strong>Hand the device to the person signing.</strong> They must read everything below and make their choices. They agree to it by signing on the next screen.
      </p>
      <div
        className="consent-scroll mt"
        tabIndex={0}
        onScroll={(e) => check(e.currentTarget)}
        ref={(el) => { if (el && !atEnd && el.scrollHeight <= el.clientHeight + 4) setAtEnd(true) }}
      >
        {reading.map((c) => (
          <section className="consent-clause" key={c.id}>
            {c.title && <h3>{c.title}</h3>}
            <p>{c.text}</p>
          </section>
        ))}
      </div>
      {!atEnd && <p className="muted small mt">Scroll to the end of the text to continue.</p>}

      {choices.length > 0 && (
        <div className="mt">
          <h3>Your choices</h3>
          <p className="muted small" style={{ margin: '4px 0 8px' }}>These are optional. Saying no does not stop you being considered for help.</p>
          {choices.map((c) => (
            <div className="consent-clause" key={c.id}>
              {c.title && <strong>{c.title}</strong>}
              <p style={{ whiteSpace: 'pre-wrap' }}>{c.text}</p>
              <label className="check-row">
                <input type="checkbox" checked={!!acks[c.id]} onChange={(e) => setAcks({ ...acks, [c.id]: e.target.checked })} />
                <span>Yes, I agree to this</span>
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>
        <button type="button" className="btn" disabled={!atEnd} onClick={onNext}>Next</button>
      </div>
    </>
  )
}

/**
 * Consent is captured separately from adding a person, so everyone it covers is already registered.
 *
 * people          the organisation's people (from GET /people)
 * signerPersonId  optional: open with this registered adult as the signer
 * coverPersonIds  optional: children to tick as covered by this signature
 * onDone          called after a successful signing
 */
export default function ConsentFlow({ orgId, people, signerPersonId = null, coverPersonIds = [], onDone, onClose }) {
  return (
    <Sheet title="Capture consent" onClose={onClose} closeLabel="Cancel">
      <Flow
        orgId={orgId}
        people={people}
        signerPersonId={signerPersonId}
        coverPersonIds={coverPersonIds}
        onDone={onDone}
        onClose={onClose}
      />
    </Sheet>
  )
}
