import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout.jsx'

export default function Terms() {
  return (
    <LegalLayout title="Terms of use">
      <p>
        These terms apply when you use Vouchr. By creating an account or signing in you agree to them. If you do not agree, please do not
        use Vouchr.
      </p>

      <h2>Who may use Vouchr</h2>
      <p>
        Vouchr is for people who work or volunteer at an organisation, and who are 18 or older. People who receive help do not need an
        account. Staff of an organisation register them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate details and an email address you own. We confirm it with a link we send you.</li>
        <li>Keep your password safe and do not share your login. You are responsible for what is done with your account.</li>
        <li>Tell us if you think someone else has used your account.</li>
      </ul>

      <h2>Using Vouchr properly</h2>
      <p>You agree to:</p>
      <ul>
        <li>only record information about people that you have a proper reason and, where needed, their consent to record, and capture consent as Vouchr requires;</li>
        <li>keep what you see about other people and organisations confidential, and use it only for the help you are giving;</li>
        <li>follow the law, including POPIA;</li>
        <li>not try to break, overload or get around the security of Vouchr, or access information that is not meant for you;</li>
        <li>not use Vouchr to harass, mislead or discriminate against anyone.</li>
      </ul>
      <p>The organisation you work for is responsible for the records it makes and for how its staff use Vouchr.</p>

      <h2>Organisations and partners</h2>
      <p>
        Organisations choose their partners, and what is shared between them depends on the agreements and consents recorded in Vouchr.
        Vouchr does not check the claims organisations make about themselves and is not a party to arrangements between organisations.
      </p>

      <h2>Your information</h2>
      <p>
        What you add to Vouchr stays yours (or your organisation&apos;s). You allow us to store and process it to run the service. How we
        handle personal information is explained in the <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep Vouchr running but cannot promise it will always be available or error-free. Features may change. Keep your own
        copies of anything you cannot afford to lose.
      </p>

      <h2>Our responsibility</h2>
      <p>
        Vouchr is provided &quot;as is&quot;. To the extent the law allows, we are not liable for indirect or consequential loss, or for
        loss that results from the actions of users or organisations. Nothing in these terms limits liability that the law does not allow
        to be limited.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Vouchr at any time. We may suspend or close an account that breaks these terms or puts others at risk, and will
        explain why where we can.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If a change matters we will update the date above and, where we can, tell you. Continuing to use Vouchr
        after a change means you accept it.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of South Africa.</p>
    </LegalLayout>
  )
}
