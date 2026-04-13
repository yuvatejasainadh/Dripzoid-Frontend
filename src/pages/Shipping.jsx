import React from "react";

export default function Shipping() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-black dark:text-white">
      <section className="max-w-5xl mx-auto px-6 py-24">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Shipping Policy
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-3xl">
            This Shipping Policy explains how orders are processed, shipped, tracked,
            delivered, and handled at Dripzoid. We partner with trusted logistics providers
            like Shiprocket to ensure reliable and secure deliveries across India.
          </p>
        </header>

        {/* Section */}
        <div className="space-y-12 text-neutral-700 dark:text-neutral-300">

          {/* Processing */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Order Processing</h2>
            <p>
              All orders are processed within <strong>1–2 business days</strong> after
              successful payment confirmation. Orders placed on weekends or public holidays
              are processed on the next working day.
            </p>
          </section>

          {/* Delivery */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Shipping & Delivery Timelines</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Standard Delivery: <strong>3–7 business days</strong> across India</li>
              <li>Delivery timelines may vary based on location, courier availability, or external factors</li>
              <li>Remote or restricted locations may experience slight delays</li>
            </ul>
          </section>

          {/* Courier */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Courier & Logistics Partners</h2>
            <p>
              Dripzoid uses Shiprocket’s logistics network, which includes trusted courier
              partners such as Delhivery, Ecom Express, Xpressbees, and others, selected
              automatically based on your delivery pin code.
            </p>
          </section>

          {/* Tracking */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Order Tracking</h2>
            <p>
              Once your order is shipped, you will receive a tracking link via
              <strong> SMS and email</strong>. Tracking updates are provided by the courier
              partner and may take up to 24 hours to reflect accurately.
            </p>
          </section>

          {/* Address */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Address Accuracy</h2>
            <p>
              Customers are responsible for providing complete and accurate delivery
              information. Incorrect or incomplete addresses may result in delayed delivery,
              additional charges, or return-to-origin (RTO).
            </p>
          </section>

          {/* RTO */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Return to Origin (RTO)</h2>
            <p>
              If an order cannot be delivered due to reasons such as customer unavailability,
              incorrect address, or refusal to accept the package, it will be returned to
              origin.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2">
              <li>RTO shipping charges may be applicable</li>
              <li>Repeated RTOs may lead to account restrictions</li>
            </ul>
          </section>

          {/* Packaging */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Packaging Responsibility</h2>
            <p>
              All Dripzoid products are packed securely using tamper-proof packaging.
              However, once handed over to the courier partner, logistics handling is managed
              by the carrier under standard shipping conditions.
            </p>
          </section>

          {/* Damage */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Damaged, Lost, or Missing Shipments</h2>
            <p>
              In rare cases of damage or loss during transit, claims are handled as per
              Shiprocket and courier partner policies. Customers must report any visible
              damage within <strong>48 hours</strong> of delivery with proper evidence.
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Liability for shipment loss or damage is limited and governed by courier and
              logistics provider policies.
            </p>
          </section>

          {/* COD */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Cash on Delivery (COD)</h2>
            <p>
              COD is available on select pin codes. Orders may be verified before dispatch.
              Dripzoid reserves the right to disable COD for users with repeated order
              rejections or failed deliveries.
            </p>
          </section>

          {/* Delays */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Unforeseen Delays</h2>
            <p>
              Delivery timelines may be affected by events beyond our control, including
              weather conditions, strikes, government restrictions, natural disasters, or
              operational issues with courier partners.
            </p>
          </section>

          {/* Compliance */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Legal & Regulatory Compliance</h2>
            <p>
              All shipments are transported in compliance with applicable Indian laws,
              courier regulations, and logistics policies. Certain items may be restricted
              from shipping as per regulatory guidelines.
            </p>
          </section>

          {/* Support */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-semibold mb-3">Need Help?</h2>
            <p>
              For shipping-related questions or support, contact us at{" "}
              <strong>support@dripzoid.com</strong>. Our team is happy to assist you.
            </p>
          </section>

        </div>
      </section>
    </main>
  );
}
