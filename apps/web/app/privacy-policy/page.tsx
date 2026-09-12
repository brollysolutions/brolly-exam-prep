import type { Metadata } from 'next';
import Link from 'next/link';
import { PolicyPage, PrivacyContact } from '@/components/policy-page';
import { deletionTiming, retainedInformation, privacyOrigin } from '@/lib/privacy';

export const metadata: Metadata = {
  title: 'Privacy Policy | Brolly Exam Prep',
  description:
    'How Brolly Exam Prep handles account information, mock-test answers, saved progress and deletion requests.',
  alternates: { canonical: `${privacyOrigin}/privacy-policy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicy() {
  return (
    <PolicyPage
      title="Privacy Policy"
      intro="This policy describes information handled by the Brolly Exam Prep Android app and website, provided by Brolly Solutions."
    >
      <section>
        <h2>About this policy</h2>
        <p>
          Brolly Exam Prep provides SI and Constable mock tests, previous-paper practice, study
          resources and result explanations in English and Telugu. This policy applies to
          mocktest.brollyexamprep.com and the Brolly Exam Prep app that connects to this service. It
          explains what is saved when you sign in, practise a test or contact us, and how to request
          access, correction or deletion.
        </p>
      </section>
      <details lang="te">
        <summary>తెలుగులో ముఖ్యమైన వివరాలు</summary>
        <p>
          మీ ఫోన్ నంబర్ సైన్ ఇన్ కోసం ఉపయోగించబడుతుంది. పరీక్ష సమాధానాలు, సమయం, ఫలితాలు సర్వర్‌లో
          నిల్వ అవుతాయి. భాష, పరీక్ష ఎంపికలు, అర్హత వివరాలు, చదువు పురోగతి మీ పరికరంలో కూడా సేవ్
          అవుతాయి.
        </p>
        <p>
          యాప్ తీసివేయడం లేదా పరికరంలోని డేటా క్లియర్ చేయడం వల్ల సర్వర్ డేటా తొలగించబడదు. ఖాతా, డేటా
          తొలగింపు కోసం <Link href="/account-deletion">Account Deletion పేజీ</Link> చూడండి.
        </p>
      </details>
      <section>
        <h2>Information we handle</h2>
        <ul>
          <li>
            <strong>Sign-in information:</strong> the phone number you enter, an account identifier
            and a session token used for sign-in.
          </li>
          <li>
            <strong>Practice activity:</strong> selected tests, answers, marked questions, time
            spent, attempt identifiers, submission status, scores and result reviews. Online
            practice records are stored on our server; the app or browser also saves progress for
            recovery and offline use.
          </li>
          <li>
            <strong>Preferences and study progress:</strong> language, selected post and reservation
            category, onboarding choices, reminder preferences, reading progress and practice
            history saved on your device or browser.
          </li>
          <li>
            <strong>Optional eligibility information:</strong> gender, eligibility group, height,
            chest measurements and physical-test performance you enter in the eligibility checker.
            The current checker stores these inputs locally for your reference.
          </li>
          <li>
            <strong>Support correspondence:</strong> your email address and information you choose
            to send when contacting us.
          </li>
          <li>
            <strong>Connection information:</strong> our hosting systems receive technical details
            such as IP address, request time and browser or app information when you connect to the
            service.
          </li>
        </ul>
      </section>
      <section>
        <h2>How information is used</h2>
        <p>
          Information is used to provide sign-in, deliver test papers, save and mark answers,
          display results, restore practice sessions, remember preferences and respond to support or
          deletion requests. Connection information helps operate and troubleshoot the service.
        </p>
        <p>
          Practice records currently use separate attempt identifiers rather than a phone-number
          link. When requesting deletion of a practice record, its attempt identifier or result link
          helps us locate it.
        </p>
      </section>
      <section>
        <h2>Device storage and permissions</h2>
        <p>
          The website uses browser storage and a service worker to save progress and cache
          downloaded content. The Android app uses local storage for preferences and practice
          recovery. Clearing local storage removes that local copy; it does not delete records
          already sent to the server.
        </p>
        <p>
          The current app does not require access to your contacts, camera, microphone or precise
          location for mock tests. The current app and website do not integrate advertising or
          third-party behavioural analytics SDKs.
        </p>
      </section>
      <section>
        <h2>Service providers and disclosure</h2>
        <p>
          Hosting and infrastructure providers process information needed to serve the website and
          API. If you email support, email providers process that correspondence. Information may
          also need to be disclosed where required by applicable law.
        </p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>
          Local information remains until you clear it or use an available local data-reset control.
          Server practice records do not currently expire automatically. You can request deletion of
          your account information and the practice records you identify through our{' '}
          <Link href="/account-deletion">Account Deletion page</Link>.
        </p>
        <p>{deletionTiming}</p>
        <p>{retainedInformation}</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can change language and exam preferences, clear locally stored information, and
          contact us about access, correction or deletion. Avoid including passwords, one-time codes
          or identity documents in an initial support email.
        </p>
      </section>
      <section>
        <h2>Keeping your information safe</h2>
        <p>
          Use the HTTPS website address when connecting to Brolly Exam Prep. Keep your device,
          sign-in information and result links private. Anyone using the same browser or an unlocked
          device may be able to see locally saved progress. Clear your site or app data before
          giving a shared device to someone else.
        </p>
        <p>
          No online service or device storage can guarantee complete security. If you believe
          someone has accessed your information, contact support with the details needed to
          investigate, without sending passwords or one-time codes.
        </p>
      </section>
      <section>
        <h2>Younger users and external websites</h2>
        <p>
          This service is intended for people preparing for recruitment and competitive exams. A
          parent or guardian can contact us about information supplied by a child and request its
          removal. Do not submit another person’s personal information without permission.
        </p>
        <p>
          Study resources may link to recruitment notices or other websites. Information you provide
          on those sites is governed by their own privacy policies. This policy covers the Brolly
          mock-test service described above.
        </p>
      </section>
      <section>
        <h2>Updates and contact</h2>
        <p>
          Changes to this policy will be published here with an updated date. For questions about
          your information, contact Brolly Solutions using the privacy support details below.
        </p>
        <PrivacyContact />
      </section>
    </PolicyPage>
  );
}
