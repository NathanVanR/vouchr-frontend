import LegalLayout from './LegalLayout.jsx'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy policy">
      <p>
        Vouchr helps South African organisations coordinate the help they give. This page explains what information Vouchr holds,
        why, who can see it, and your rights under the Protection of Personal Information Act (POPIA).
      </p>

      <h2>Two kinds of people, two kinds of information</h2>
      <p>
        <strong>Staff</strong> are the people who work or volunteer at an organisation and sign in to Vouchr. They are the only people
        with a Vouchr login. <strong>People who receive help</strong> never create an account: staff of an organisation add them.
      </p>
      <p>
        For information about people who receive help, the <strong>organisation that registered them decides why and how it is used</strong>
        {' '}and is responsible for it. Vouchr stores and processes it on that organisation&apos;s behalf. For staff accounts, Vouchr is responsible.
      </p>

      <h2>What we hold</h2>
      <h3>About staff</h3>
      <ul>
        <li>Name, email address and phone number.</li>
        <li>Your password, which is handled and stored by our sign-in provider; we never see it. If you sign in with Google we receive your name and email address from Google, and nothing else.</li>
        <li>Which organisations you belong to and your role there.</li>
      </ul>
      <h3>About people who receive help</h3>
      <ul>
        <li>Whatever the organisation chooses to record, which can include a name and surname, ID number, date of birth, contact details, address and family links. Almost none of it is compulsory.</li>
        <li>The signed POPIA consent: the wording that was agreed, the date, the names of the signer and witness, a drawn signature and a sealed PDF copy.</li>
        <li>Care plans (services such as counselling, a course or a food parcel, and when someone was checked in), and what a person received from a project.</li>
      </ul>
      <h3>About organisations</h3>
      <ul>
        <li>The name, address and contact details of the organisation, its projects, and the events it adds to the shared area calendar.</li>
      </ul>
      <h3>Technical</h3>
      <ul>
        <li>Standard server logs (for example the time of a request and an error message) so we can keep the service running and fix faults.</li>
        <li>Your browser stores your sign-in session and a copy of the app so it loads quickly. We do not use advertising or tracking cookies.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To let you sign in and to keep accounts secure, including confirming that your email address is yours.</li>
        <li>To let organisations keep clean records, capture consent and coordinate care and projects.</li>
        <li>To send emails you need: confirming your address, changing it, resetting your password.</li>
      </ul>
      <p>We do not sell personal information and we do not use it for advertising.</p>

      <h2>Who can see it</h2>
      <ul>
        <li><strong>Records of people who receive help</strong> are visible to the organisation that registered them. Another organisation sees something only when the person has agreed that it can, and only the part that is needed (for example a partner delivering a service sees the people it serves).</li>
        <li>The <strong>area page</strong> shows other organisations&apos; names, projects and events. It never shows anything about people, and an organisation can hide itself from it.</li>
        <li>Vouchr staff who run the platform can access data only where needed to keep the service working.</li>
      </ul>

      <h2>Who processes it for us</h2>
      <p>We use these services to run Vouchr. Each handles information only to provide its service:</p>
      <ul>
        <li><strong>Supabase</strong>: sign-in and account management, and the database.</li>
        <li><strong>Google Cloud</strong>: runs the Vouchr server (Johannesburg region).</li>
        <li><strong>Resend</strong>: delivers our emails.</li>
        <li><strong>GitHub Pages</strong>: serves the website.</li>
        <li><strong>Google</strong>: only if you choose &quot;Continue with Google&quot;.</li>
      </ul>
      <p>Some of these providers process information outside South Africa. We choose providers that protect it to a comparable standard.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep information while the organisation uses Vouchr and as long as the law or the purpose requires. When an organisation or a
        person asks for information to be corrected or deleted, we will do so unless the law requires us to keep it.
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Connections are encrypted, access needs a verified account, organisations only see their own records, and consent documents are
        sealed with a hash so changes can be detected. No system is perfectly secure; if something happens that puts your information at
        risk we will tell the affected organisations and, where the law requires, the Information Regulator.
      </p>

      <h2>Children</h2>
      <p>
        Organisations may record children they help. A parent or guardian who is registered on the system signs the consent, and the
        organisation is responsible for having that authority. Children do not use Vouchr themselves.
      </p>

      <h2>Your rights</h2>
      <p>Under POPIA you may ask to:</p>
      <ul>
        <li>know what information is held about you and see it;</li>
        <li>have it corrected or deleted;</li>
        <li>object to how it is used, or withdraw a consent you gave.</li>
      </ul>
      <p>
        If your information was recorded by an organisation, ask that organisation first; it can usually fix things straight away. You can
        also complain to the Information Regulator at <a href="https://inforegulator.org.za" target="_blank" rel="noreferrer">inforegulator.org.za</a>.
      </p>

      <h2>Changes</h2>
      <p>If we change this page in a way that matters we will update the date above and, where we can, tell staff when they next sign in.</p>
    </LegalLayout>
  )
}
