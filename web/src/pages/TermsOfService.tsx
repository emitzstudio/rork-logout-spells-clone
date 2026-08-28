import { Link } from "react-router-dom";

import {
  PolicyLead,
  PolicyList,
  PolicySection,
  PolicyShell,
  PolicyText,
} from "@/components/site/PolicyPage";

/** Quiet gold inline link used when one policy references another. */
const LINK_CLASS =
  "text-gold-light underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold";

/** The official terms of service. Route: /terms. */
export default function TermsOfService() {
  return (
    <PolicyShell
      title="Terms of Service"
      heading={
        <>
          Terms of <span className="italic text-gold-gradient">Service</span>
        </>
      }
      description="The terms that govern your use of the Logout Spells website and services: bookings, payments, cancellations, user content, intellectual property, liability and more."
      path="/terms"
      intro={
        <>
          <PolicyLead>Welcome to Logout Spells.</PolicyLead>
          <PolicyText>
            These Terms of Service govern your access to and use of the Logout Spells website and
            the travel experiences, trips, bookings, and other services made available through it.
          </PolicyText>
          <PolicyText>
            By accessing our website, creating an account, submitting information, or making a
            booking through Logout Spells, you agree to be bound by these Terms.
          </PolicyText>
          <PolicyText>
            If you do not agree with these Terms, please do not use the website or its services.
          </PolicyText>
        </>
      }
    >
      <PolicySection number="01" title="Use of Our Services">
        <PolicyText>
          Logout Spells provides a platform for discovering and participating in travel
          experiences and group trips.
        </PolicyText>
        <PolicyText>
          The information available on the website may include trip descriptions, itineraries,
          dates, prices, availability, activities, photographs, and other travel-related
          information.
        </PolicyText>
        <PolicyText>
          Trip details may be subject to change where circumstances outside our reasonable control
          require it.
        </PolicyText>
      </PolicySection>

      <PolicySection number="02" title="Eligibility">
        <PolicyText>
          By using Logout Spells, you confirm that you are legally capable of entering into an
          agreement under the laws applicable to you.
        </PolicyText>
        <PolicyText>
          If you are using the website on behalf of another person, you are responsible for
          ensuring that they understand and agree to the applicable terms.
        </PolicyText>
      </PolicySection>

      <PolicySection number="03" title="Bookings & Payments">
        <PolicyText>
          When you make a booking through Logout Spells, you agree to provide accurate and
          complete information.
        </PolicyText>
        <PolicyText>
          You are responsible for ensuring that the information submitted during booking is
          correct and up to date.
        </PolicyText>
        <PolicyText>
          A booking is subject to the availability and confirmation conditions shown on the
          relevant trip page.
        </PolicyText>
        <PolicyText>
          Trip confirmation may depend on meeting the minimum participation required for that
          trip.
        </PolicyText>
      </PolicySection>

      <PolicySection number="04" title="Cancellations & Refunds">
        <PolicyText>
          Cancellations and refunds are governed by the Logout Spells{" "}
          <Link to="/refund-policy" className={LINK_CLASS}>
            Refund &amp; Cancellation Policy
          </Link>
          .
        </PolicyText>
        <PolicyText>By making a booking, you acknowledge and agree to those terms.</PolicyText>
      </PolicySection>

      <PolicySection number="05" title="Accuracy of Information">
        <PolicyText>
          We make reasonable efforts to keep the information on the website accurate and current.
        </PolicyText>
        <PolicyText>
          However, travel information, availability, dates, itineraries, activities, prices, and
          other details may change.
        </PolicyText>
        <PolicyText>
          We reserve the right to correct errors, inaccuracies, or omissions and to update
          information when necessary.
        </PolicyText>
      </PolicySection>

      <PolicySection number="06" title="Changes to Our Services">
        <PolicyText>
          We may update, modify, suspend, or discontinue parts of the website or our services when
          reasonably necessary.
        </PolicyText>
        <PolicyText>
          We may also update trip information, pricing, availability, itineraries, or activities.
        </PolicyText>
        <PolicyText>
          Such changes may be necessary because of operational requirements, weather, government
          restrictions, safety concerns, availability, or other circumstances beyond our
          reasonable control.
        </PolicyText>
      </PolicySection>

      <PolicySection number="07" title="Third-Party Services & Links">
        <PolicyText>
          The website may contain links to websites or services operated by third parties.
        </PolicyText>
        <PolicyText>These third-party services are outside Logout Spells&apos; control.</PolicyText>
        <PolicyText>
          We are not responsible for the content, availability, privacy practices, security, or
          policies of third-party websites or services.
        </PolicyText>
        <PolicyText>
          You should review the terms and privacy policies of any third-party service before
          using it.
        </PolicyText>
      </PolicySection>

      <PolicySection number="08" title="User Accounts">
        <PolicyText>
          Some features of Logout Spells may require you to create an account.
        </PolicyText>
        <PolicyText>
          You are responsible for maintaining the confidentiality of your account credentials and
          for activity carried out through your account.
        </PolicyText>
        <PolicyText>
          You should notify Logout Spells if you believe that your account has been accessed
          without your permission.
        </PolicyText>
      </PolicySection>

      <PolicySection number="09" title="User-Generated Content">
        <PolicyText>
          Users may be able to submit reviews, testimonials, feedback, photographs, comments, or
          other content through Logout Spells.
        </PolicyText>
        <PolicyText>
          By submitting content, you confirm that you have the right to submit it and that it does
          not knowingly violate the rights of another person.
        </PolicyText>
        <PolicyText>
          You grant Logout Spells permission to use submitted content for purposes related to
          operating, presenting, promoting, and improving our services, subject to applicable law.
        </PolicyText>
        <PolicyText>
          We may remove content that we reasonably believe is unlawful, abusive, misleading,
          offensive, or otherwise inappropriate.
        </PolicyText>
      </PolicySection>

      <PolicySection number="10" title="Prohibited Use">
        <PolicyText>You must not use Logout Spells:</PolicyText>
        <PolicyList
          items={[
            "for any unlawful purpose;",
            "to provide false or misleading information;",
            "to impersonate another person;",
            "to interfere with the operation or security of the website;",
            "to upload malicious code, viruses, or harmful material;",
            "to attempt unauthorized access to accounts, systems, or data;",
            "to infringe intellectual property or other rights;",
            "to harass, threaten, abuse, or discriminate against others;",
            "to scrape, copy, or exploit website content without permission.",
          ]}
        />
      </PolicySection>

      <PolicySection number="11" title="Intellectual Property">
        <PolicyText>
          The Logout Spells website, including its branding, design, written content, photographs,
          graphics, logos, and other original materials, is protected by applicable intellectual
          property laws.
        </PolicyText>
        <PolicyText>
          You may not reproduce, distribute, modify, sell, or commercially exploit our content
          without prior written permission, except where permitted by law.
        </PolicyText>
      </PolicySection>

      <PolicySection number="12" title="Personal Information">
        <PolicyText>
          Your use of Logout Spells and submission of personal information is governed by our{" "}
          <Link to="/privacy" className={LINK_CLASS}>
            Privacy Policy
          </Link>
          .
        </PolicyText>
        <PolicyText>
          Please review the Privacy Policy to understand how personal information is collected,
          used, stored, and disclosed.
        </PolicyText>
      </PolicySection>

      <PolicySection number="13" title="Website Availability">
        <PolicyText>
          We aim to keep Logout Spells available and functioning smoothly, but we do not guarantee
          that the website or every service will always be uninterrupted, error-free, secure, or
          available.
        </PolicyText>
        <PolicyText>
          Temporary interruptions may occur because of maintenance, technical issues, third-party
          services, network problems, or circumstances beyond our reasonable control.
        </PolicyText>
      </PolicySection>

      <PolicySection number="14" title="Disclaimer">
        <PolicyText>
          Travel involves circumstances that may be outside our control, including weather,
          natural events, government restrictions, transportation issues, local conditions, and
          changes to third-party services.
        </PolicyText>
        <PolicyText>
          Information provided on the website is intended to help travellers make informed
          decisions, but circumstances may require changes to planned experiences.
        </PolicyText>
      </PolicySection>

      <PolicySection number="15" title="Limitation of Liability">
        <PolicyText>
          To the maximum extent permitted by applicable law, Logout Spells will not be liable for
          indirect, incidental, special, consequential, or punitive losses arising from your use
          of the website or services.
        </PolicyText>
        <PolicyText>
          Nothing in these Terms is intended to exclude or limit liability that cannot legally be
          excluded or limited under applicable law.
        </PolicyText>
      </PolicySection>

      <PolicySection number="16" title="Indemnification">
        <PolicyText>
          You agree to indemnify and hold Logout Spells harmless from claims, losses, liabilities,
          damages, and reasonable expenses arising from your violation of these Terms, misuse of
          the website, or violation of the rights of another person.
        </PolicyText>
      </PolicySection>

      <PolicySection number="17" title="Termination">
        <PolicyText>
          We may suspend or terminate access to the website or particular services where
          reasonably necessary, including where a user violates these Terms or engages in harmful,
          fraudulent, unlawful, or abusive activity.
        </PolicyText>
      </PolicySection>

      <PolicySection number="18" title="Severability">
        <PolicyText>
          If any provision of these Terms is found to be unlawful or unenforceable, the remaining
          provisions will continue to remain effective to the fullest extent permitted by law.
        </PolicyText>
      </PolicySection>

      <PolicySection number="19" title="Entire Agreement">
        <PolicyText>
          These Terms, together with the policies referenced within them, constitute the agreement
          governing your use of Logout Spells and its services.
        </PolicyText>
      </PolicySection>

      <PolicySection number="20" title="Governing Law">
        <PolicyText>
          These Terms and any separate agreements relating to the services provided by Logout
          Spells shall be governed by and interpreted in accordance with the laws of India.
        </PolicyText>
      </PolicySection>

      <PolicySection number="21" title="Changes to These Terms">
        <PolicyText>We may update these Terms from time to time.</PolicyText>
        <PolicyText>
          The updated version will be published on this page. Your continued use of the website
          after changes are published constitutes acceptance of the updated Terms to the extent
          permitted by law.
        </PolicyText>
      </PolicySection>
    </PolicyShell>
  );
}
