import React from "react";
import {
  ShieldCheck,
  User,
  Mail,
  Database,
  Globe,
  Clock,
  Lock,
  Trash2,
  Zap,
  MapPin,
  Info,
} from "lucide-react";

/**
 * PrivacyPolicy.jsx
 * Modern, detailed privacy policy section for Dripzoid
 */

export default function PrivacyPolicy() {
  const lastUpdated = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 text-neutral-900 dark:text-neutral-100 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="rounded-3xl p-8 bg-white/60 dark:bg-neutral-900/60 shadow-xl border border-neutral-200/10">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-black text-white dark:bg-white dark:text-black flex-none">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold">Privacy Policy</h1>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Your privacy matters. This policy explains how <strong>Dripzoid</strong> collects,
                  uses, stores, and protects your information.
                </p>
                <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  Last updated: <time dateTime={new Date().toISOString()}>{lastUpdated}</time>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Intro */}
        <section className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <h2 className="text-xl font-semibold mb-3">Who we are</h2>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Dripzoid is an Indian streetwear brand (brand & e-commerce operator). We are committed
              to protecting your privacy while delivering a great shopping experience across our
              website and services.
            </p>
          </div>

          <div className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <h2 className="text-xl font-semibold mb-3">Scope of this policy</h2>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              This policy applies to data collected via our website, mobile apps, in-store forms,
              customer service communications, and any other interactions where you provide personal
              information to Dripzoid.
            </p>
          </div>
        </section>

        {/* Table of contents */}
        <nav className="mb-8 p-4 rounded-xl bg-white/40 dark:bg-neutral-900/40 border border-neutral-200/10">
          <h3 className="text-sm font-medium mb-2">Contents</h3>
          <ul className="text-sm text-neutral-600 dark:text-neutral-400 grid grid-cols-2 gap-2">
            <li><a href="#what-we-collect" className="underline-offset-2 hover:underline">What we collect</a></li>
            <li><a href="#how-we-use" className="underline-offset-2 hover:underline">How we use data</a></li>
            <li><a href="#sharing" className="underline-offset-2 hover:underline">Third-party sharing</a></li>
            <li><a href="#cookies" className="underline-offset-2 hover:underline">Cookies & tracking</a></li>
            <li><a href="#retention" className="underline-offset-2 hover:underline">Data retention</a></li>
            <li><a href="#security" className="underline-offset-2 hover:underline">Security</a></li>
            <li><a href="#rights" className="underline-offset-2 hover:underline">Your rights</a></li>
            <li><a href="#contact" className="underline-offset-2 hover:underline">Contact us</a></li>
          </ul>
        </nav>

        {/* Core sections */}
        <article className="space-y-8">
          <section id="what-we-collect" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <User className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Information we collect</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              We collect information you provide directly and information collected automatically when
              you use our services.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Personal information (you provide)</h4>
                <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                  <li>Full name, email address, phone number</li>
                  <li>Shipping & billing address, order details</li>
                  <li>Account credentials (username, password — stored securely)</li>
                  <li>Customer service messages and support transcripts</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Technical & usage data (automatic)</h4>
                <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
                  <li>IP address, device identifiers, browser & OS</li>
                  <li>Pages visited, clickstream, search queries</li>
                  <li>Referrer, marketing campaign metadata</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="how-we-use" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Zap className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">How we use your data</h3>
            </div>

            <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-2">
              <li><strong>Order fulfilment:</strong> Process and deliver purchases, manage payments and returns.</li>
              <li><strong>Account & preferences:</strong> Maintain your account, show order history, save sizes and preferences.</li>
              <li><strong>Customer support:</strong> Respond to inquiries, investigate issues, and improve service quality.</li>
              <li><strong>Personalization:</strong> Recommend products, tailor marketing communications and offers.</li>
              <li><strong>Security & fraud prevention:</strong> Detect and prevent fraudulent or unlawful activity.</li>
              <li><strong>Legal obligations:</strong> Comply with legal, tax and regulatory requirements.</li>
            </ul>
          </section>

          <section id="legal-basis" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Info className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Legal basis (where applicable)</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Where relevant (for users in regions with data-protection laws) we process personal data based on:
            </p>
            <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300 mt-2 space-y-1">
              <li>Contract performance (processing orders)</li>
              <li>Legitimate interests (fraud prevention, product improvement)</li>
              <li>Consent (marketing emails, newsletters — you can opt out)</li>
              <li>Legal compliance (tax, accounting, regulatory needs)</li>
            </ul>
          </section>

          <section id="sharing" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Globe className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Third-party sharing</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              We only share data with trusted partners to provide our services. This includes:
            </p>

            <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-2">
              <li><strong>Payment processors:</strong> to securely take payments (we never store full card data).</li>
              <li><strong>Shipping & logistics:</strong> to fulfil orders and returns.</li>
              <li><strong>Analytics providers:</strong> to understand how customers use our site and improve it.</li>
              <li><strong>Marketing platforms:</strong> for email delivery and campaign analytics (with opt-out options).</li>
            </ul>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">Examples of partners</summary>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Payment gateways, courier services, email providers (e.g. transactional email platforms), analytics suites, and CRM providers. We maintain contracts and ensure each partner follows industry security standards.
              </p>
            </details>
          </section>

          <section id="cookies" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Database className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Cookies & tracking</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Cookies and similar technologies help us remember your preferences, provide secure sessions,
              analyse traffic, and personalise content and ads. Types include:
            </p>

            <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300 mt-3 space-y-1">
              <li><strong>Essential cookies:</strong> required for site functionality (cart, login).</li>
              <li><strong>Performance & analytics:</strong> anonymized usage data to improve the site.</li>
              <li><strong>Marketing cookies:</strong> to show relevant offers (you can opt out in preferences).</li>
            </ul>

            <details className="mt-3">
              <summary className="cursor-pointer font-medium">Manage cookies</summary>
              <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                You can manage cookies via your browser settings or through any cookie preference tool we display on the site.
              </div>
            </details>
          </section>

          <section id="retention" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Clock className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Data retention</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              We retain personal data only as long as necessary for the purpose collected, to comply with law,
              or to resolve disputes. Typical retention examples:
            </p>

            <ul className="text-sm text-neutral-700 dark:text-neutral-300 mt-3 space-y-1">
              <li>Order & transactional records: retained for legal/tax periods (usually several years).</li>
              <li>Support transcripts: retained while account is active and for a reasonable period after.</li>
              <li>Marketing preferences: retained until you opt out.</li>
            </ul>
          </section>

          <section id="security" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Lock className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Security</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              We use industry-standard safeguards to protect your information, including:
            </p>

            <ul className="list-disc list-inside text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <li>Encrypted connections (HTTPS / TLS)</li>
              <li>Secure data storage and access controls</li>
              <li>Regular security assessments and monitoring</li>
            </ul>

            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              No system is 100% secure — if we become aware of a breach affecting your data, we will notify
              affected users and authorities as required by law.
            </p>
          </section>

          <section id="rights" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Trash2 className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Your rights & choices</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
              Depending on where you live, you may have rights including:
            </p>

            <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Ask us to delete data where permitted.</li>
              <li><strong>Objection & restriction:</strong> Object to processing or request limitations.</li>
              <li><strong>Portability:</strong> Request your data in a commonly used format.</li>
            </ul>

            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              To exercise any right, contact us (see the Contact section). We may need to verify your identity
              before acting on requests.
            </p>
          </section>

          <section id="children" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <MapPin className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Children's privacy</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Our services are not directed to children under 16. We do not knowingly collect personal
              information from children. If you believe we have collected such data, contact us and we will
              take steps to remove it.
            </p>
          </section>

          <section id="international" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Globe className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">International transfers</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              We operate globally. Your data may be transferred to and processed in countries with different
              data protection laws. We take contractual and technical measures to protect your rights in such transfers.
            </p>
          </section>

          <section id="updates" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Clock className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Changes to this policy</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              We may update this policy to reflect changes in our practices or legal requirements. We’ll post
              a notification on the site and update the “Last updated” date above.
            </p>
          </section>

          <section id="contact" className="rounded-2xl p-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200/10 shadow">
            <div className="flex items-start gap-4 mb-4">
              <Mail className="w-6 h-6 text-black dark:text-white" />
              <h3 className="text-xl font-semibold">Contact & requests</h3>
            </div>

            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              For questions about this Privacy Policy or to exercise your data rights, contact our Data Protection team:
            </p>

            <div className="rounded-lg p-4 bg-gradient-to-r from-white/60 to-neutral-50 dark:from-neutral-800/60 dark:to-neutral-900/60 border border-neutral-200/10">
              <p className="text-sm"><strong>Email:</strong> <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:privacy@dripzoid.com">privacy@dripzoid.com</a></p>
              <p className="text-sm mt-1"><strong>Support:</strong> <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:support@dripzoid.com">support@dripzoid.com</a></p>
              <p className="text-sm mt-1">Address: Dripzoid, Near Cattle Market, Pithapuram, Andhra Pradesh, India - 533450</p>
            </div>
          </section>
        </article>

        {/* Footer note */}
        <footer className="mt-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>
            Dripzoid respects your privacy and works to be transparent about how we handle personal data.
            This policy is not a contract — it explains our current practices and may be updated from time to time.
          </p>
        </footer>
      </div>
    </main>
  );
}
