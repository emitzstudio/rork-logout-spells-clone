import {
  PolicyGroup,
  PolicyLead,
  PolicyList,
  PolicySection,
  PolicyShell,
  PolicyText,
} from "@/components/site/PolicyPage";

/** The official privacy policy. Route: /privacy. */
export default function PrivacyPolicy() {
  return (
    <PolicyShell
      title="Privacy Policy"
      heading={
        <>
          Privacy <span className="italic text-gold-gradient">Policy</span>
        </>
      }
      description="How Logout Spells collects, uses, keeps and discloses personal information when you browse the website, create an account, make a booking or share your story with us."
      path="/privacy"
      intro={
        <>
          <PolicyLead>Your privacy matters to us.</PolicyLead>
          <PolicyText>
            This Privacy Policy explains how Logout Spells may collect, use, store, and disclose
            personal information when you visit our website, create an account, make a booking,
            communicate with us, submit a review, or otherwise use our services.
          </PolicyText>
          <PolicyText>
            By using Logout Spells, you acknowledge the practices described in this Privacy
            Policy.
          </PolicyText>
        </>
      }
    >
      <PolicySection number="01" title="Information We Collect">
        <PolicyText>
          The information we collect depends on how you interact with Logout Spells.
        </PolicyText>
        <PolicyText>This may include:</PolicyText>
        <div className="space-y-6 pt-1">
          <PolicyGroup
            title="Basic contact information"
            items={[
              "Name",
              "Email address",
              "Phone number",
              "Other contact information you choose to provide",
            ]}
          />
          <PolicyGroup
            title="Account information"
            items={[
              "Account details",
              "Login-related information",
              "Information associated with your Logout Spells account",
            ]}
          />
          <PolicyGroup
            title="Booking information"
            items={[
              "Traveller information",
              "Trip or spell selected",
              "Booking details",
              "Information required to coordinate your participation in a trip",
              "Payment or transaction-related information where applicable",
            ]}
          />
          <PolicyGroup
            title="Communication information"
            items={[
              "Messages you send to us",
              "Support requests",
              "Feedback",
              "Other information you choose to provide when communicating with us",
            ]}
          />
          <PolicyGroup
            title="Review and user-generated content"
            items={[
              "Reviews",
              "Testimonials",
              "Feedback",
              "Photographs or other content you voluntarily submit",
            ]}
          />
        </div>
      </PolicySection>

      <PolicySection number="02" title="Information Collected Automatically">
        <PolicyText>
          When you use our website, certain technical information may be collected automatically
          depending on the technologies and third-party services currently used by the website.
        </PolicyText>
        <PolicyText>This may include information such as:</PolicyText>
        <PolicyList
          items={[
            "Device and browser information",
            "Basic technical information",
            "IP address",
            "Pages or content accessed",
            "Usage information",
          ]}
        />
        <PolicyText>
          Cookies or similar technologies may also be used where implemented by the website.
        </PolicyText>
      </PolicySection>

      <PolicySection number="03" title="How We Use Personal Information">
        <PolicyText>We may use personal information to:</PolicyText>
        <PolicyList
          items={[
            "provide and operate our services;",
            "create and manage traveller accounts;",
            "process and manage bookings;",
            "communicate with travellers about bookings and trips;",
            "provide customer support;",
            "respond to questions and requests;",
            "manage reviews and testimonials;",
            "improve the website and our services;",
            "maintain website security;",
            "detect and prevent fraudulent, abusive, or unlawful activity;",
            "comply with legal obligations;",
            "communicate important service-related information.",
          ]}
        />
        <PolicyText>
          Where applicable and permitted by law, we may also use information to send promotional
          or marketing communications.
        </PolicyText>
      </PolicySection>

      <PolicySection number="04" title="How We Share Personal Information">
        <PolicyText>
          We may share personal information with service providers and third parties where
          reasonably necessary to operate Logout Spells and provide our services.
        </PolicyText>
        <PolicyText>This may include providers supporting areas such as:</PolicyText>
        <PolicyList
          items={[
            "website and infrastructure hosting;",
            "database and cloud services;",
            "authentication;",
            "payment processing;",
            "analytics;",
            "communications;",
            "customer support;",
            "other technical services required to operate the website.",
          ]}
        />
        <PolicyText>
          We may also disclose information where required by law, legal process, government
          authorities, or where necessary to protect the rights, safety, or security of Logout
          Spells, our users, or others.
        </PolicyText>
        <PolicyText>
          We do not sell personal information merely because it is collected through the website.
        </PolicyText>
      </PolicySection>

      <PolicySection number="05" title="User-Generated Content">
        <PolicyText>
          If you voluntarily submit a review, testimonial, photograph, or other content intended
          to be displayed publicly, that content may become publicly accessible.
        </PolicyText>
        <PolicyText>
          Please avoid submitting personal or confidential information that you do not want to be
          made public.
        </PolicyText>
      </PolicySection>

      <PolicySection number="06" title="Third-Party Websites">
        <PolicyText>
          Logout Spells may contain links to third-party websites or services.
        </PolicyText>
        <PolicyText>
          We are not responsible for the privacy practices, security, or content of those third
          parties.
        </PolicyText>
        <PolicyText>
          We recommend reviewing their respective privacy policies before providing them with
          personal information.
        </PolicyText>
      </PolicySection>

      <PolicySection number="07" title="Children's Data">
        <PolicyText>
          Logout Spells is not intended to knowingly collect personal information from children
          where such collection is prohibited by applicable law.
        </PolicyText>
        <PolicyText>
          If you believe that a child has provided personal information to us improperly, please
          contact us so that appropriate action can be taken.
        </PolicyText>
      </PolicySection>

      <PolicySection number="08" title="Security">
        <PolicyText>
          We take reasonable measures designed to protect personal information from unauthorized
          access, misuse, alteration, or disclosure.
        </PolicyText>
        <PolicyText>
          However, no method of transmitting or storing information online can be guaranteed to
          be completely secure.
        </PolicyText>
      </PolicySection>

      <PolicySection number="09" title="Data Retention">
        <PolicyText>
          We retain personal information for as long as reasonably necessary for the purposes
          described in this Privacy Policy, including to provide services, maintain accounts,
          process bookings, comply with legal obligations, resolve disputes, and enforce
          agreements.
        </PolicyText>
        <PolicyText>
          The exact retention period may vary depending on the type of information and the
          purpose for which it was collected.
        </PolicyText>
      </PolicySection>

      <PolicySection number="10" title="Your Rights & Choices">
        <PolicyText>
          Depending on applicable law and your location, you may have rights relating to your
          personal information, including:
        </PolicyText>
        <PolicyList
          items={[
            "the right to request access to personal information we hold about you;",
            "the right to request correction of inaccurate information;",
            "the right to request deletion of personal information where applicable;",
            "the right to withdraw consent where processing is based on consent;",
            "the right to object to or restrict certain processing where applicable;",
            "the right to request a copy of certain personal information where applicable.",
          ]}
        />
        <PolicyText>These rights may be subject to legal limitations and exceptions.</PolicyText>
      </PolicySection>

      <PolicySection number="11" title="Exercising Your Rights">
        <PolicyText>
          If you want to request access, correction, deletion, or otherwise exercise applicable
          privacy rights, please contact Logout Spells using the contact information provided on
          the website.
        </PolicyText>
        <PolicyText>
          We may need to verify your identity before processing certain requests.
        </PolicyText>
      </PolicySection>

      <PolicySection number="12" title="Changes to This Privacy Policy">
        <PolicyText>
          We may update this Privacy Policy from time to time to reflect changes to our services,
          technology, legal requirements, or privacy practices.
        </PolicyText>
        <PolicyText>
          When we make changes, the updated policy will be published on this page.
        </PolicyText>
      </PolicySection>
    </PolicyShell>
  );
}
