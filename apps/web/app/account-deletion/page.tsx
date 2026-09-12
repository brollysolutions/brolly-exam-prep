import type { Metadata } from 'next';
import Link from 'next/link';
import { PolicyPage, PrivacyContact } from '@/components/policy-page';
import { deletionTiming, retainedInformation, privacyOrigin } from '@/lib/privacy';

export const metadata: Metadata = {
  title: 'Account Deletion | Brolly Exam Prep',
  description:
    'Request deletion of your Brolly Exam Prep account and associated data without reinstalling the app.',
  alternates: { canonical: `${privacyOrigin}/account-deletion` },
  robots: { index: true, follow: true },
};

export default function AccountDeletion() {
  return (
    <PolicyPage
      title="Account Deletion"
      intro="Request deletion of your Brolly Exam Prep account and associated data from Brolly Solutions. You do not need to reinstall the app to contact us."
    >
      <section id="request-deletion">
        <h2>Request account and data deletion</h2>
        <PrivacyContact deletion />
        <ol>
          <li>
            Include the phone number used in Brolly Exam Prep, with its country code, and whether
            you used Android or the website.
          </li>
          <li>
            Ask to delete your account and associated data. For test records, include attempt or
            result links if you still have them; these help locate records that are stored
            separately from your phone number.
          </li>
          <li>
            Support may ask you to verify ownership before removing information. Do not send
            passwords, one-time codes or identity documents in your initial request.
          </li>
        </ol>
        <p>
          You may also request deletion of specific practice records without requesting deletion of
          your account.
        </p>
        <h2>Email content you can use</h2>
        <p>
          “Please delete my Brolly Exam Prep account and associated personal data. My registered
          phone number is [your number with country code]. I used [Android / website]. The test
          records I want removed are [available attempt or result links]. Please let me know how to
          verify ownership, the expected completion date and whether any information must be
          retained.”
        </p>
        <p>Replace the bracketed details with your own information before sending.</p>
      </section>
      <details lang="te">
        <summary>తెలుగులో తొలగింపు సూచనలు</summary>
        <p>
          మీ ఖాతా, దానికి సంబంధించిన డేటా తొలగించాలని supportకు ఇమెయిల్ పంపండి. యాప్‌లో ఉపయోగించిన
          ఫోన్ నంబర్, అందుబాటులో ఉంటే పరీక్ష ఫలితాల లింకులు ఇవ్వండి. యాప్ మళ్లీ install చేయాల్సిన
          అవసరం లేదు.
        </p>
        <p>
          యాప్‌లోని Profile → Delete account ప్రస్తుతం ఆ పరికరంలోని డేటా మాత్రమే తొలగిస్తుంది.
          సర్వర్‌లో ఉన్న డేటా కోసం ప్రత్యేకంగా request పంపాలి. ఇమెయిల్ లింక్ నొక్కిన తర్వాత మీ mail
          app నుంచి ఇమెయిల్ పంపాలి.
        </p>
      </details>
      <section>
        <h2>What the request covers</h2>
        <ul>
          <li>The phone-number account record and its sign-in sessions.</li>
          <li>
            Identifiable practice attempts, saved answers, scores and results specified in your
            request.
          </li>
        </ul>
        <p>
          Practice records are currently stored under separate attempt identifiers. A phone number
          alone may not locate every record. If you no longer have a result link, explain this in
          your request so support can help identify the available records.
        </p>
      </section>
      <section>
        <h2>Clear copies on your devices</h2>
        <p>
          On Android, open Brolly Exam Prep → Profile → Delete account and confirm to clear
          information stored by the app on that device. This control currently clears local data
          only. Send the request above for server-side deletion as well.
        </p>
        <p>
          For the website, use your browser settings to clear site data for
          mocktest.brollyexamprep.com. This removes locally saved preferences and progress in that
          browser. Repeat on any other devices you used. Uninstalling the app alone does not submit
          a server deletion request.
        </p>
        <p>
          After local data is cleared, unsent answers and local history cannot be recovered from
          that device. Deleting a server practice record also removes access to that record and its
          result.
        </p>
      </section>
      <section>
        <h2>Completion time and retained information</h2>
        <p>{deletionTiming}</p>
        <p>{retainedInformation}</p>
        <p>
          Keep your sent email until your request is resolved. If you need an update, reply to the
          same email conversation. Sending a request does not immediately erase records; ask support
          to confirm which records have been removed and which, if any, remain.
        </p>
        <p>
          Read our <Link href="/privacy-policy">Privacy Policy</Link> for the information handled by
          the app and website.
        </p>
      </section>
      <section>
        <h2>Common questions</h2>
        <h3>Do I need to install the app again?</h3>
        <p>No. You can send your request by email from any device.</p>
        <h3>Does signing out delete my server data?</h3>
        <p>
          No. Signing out or clearing browser storage does not send a server deletion request. Use
          the email link above for account and server records.
        </p>
        <h3>Can I keep practising after clearing local data?</h3>
        <p>
          Yes, you can open the service and start a new practice session. Locally cleared answers,
          preferences and history will no longer be available on that device.
        </p>
      </section>
    </PolicyPage>
  );
}
