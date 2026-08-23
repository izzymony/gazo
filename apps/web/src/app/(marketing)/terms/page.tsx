/* eslint-disable react/no-unescaped-entities */

"use client";

import { useRouter } from "next/navigation";

export default function TermsofUse() {
  const router = useRouter();
  return (
    <div className="flex bg-white justify-center w-full h-full overflow-y-scroll scrollbar-hide">
      <div className="border sm:w-[450px] w-full flex flex-col gap-6 p-4 ">
        <div className="flex items-center gap-2 -ml-2">
          <div className=" cursor-pointer" onClick={() => router.back()}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <mask
                id="mask0_8992_70720"
                maskUnits="userSpaceOnUse"
                x="8"
                y="8"
                width="20"
                height="20">
                <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
              </mask>
              <g mask="url(#mask0_8992_70720)">
                <path
                  d="M23.832 17.9993H12.1654M12.1654 17.9993L17.9987 12.166M12.1654 17.9993L17.9987 23.8327"
                  stroke="white"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M23.832 17.9993H12.1654M12.1654 17.9993L17.9987 12.166M12.1654 17.9993L17.9987 23.8327"
                  stroke="black"
                  stroke-opacity="0.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
          </div>
          <p className="text-base text-black font-medium tracking-wider leading-[20px]">
            Terms of Service
          </p>
        </div>
        <div className="space-y-5 border-b border-b-ink-10 pb-6">
          <div className="text-display font-medium leading-[45px] text-black">
            Vibaar
            <br />
            Terms of Service
          </div>
          <p className="text-ink-90 text-body-sm leading-[16px] font-normal">
            Effective Date: 1st December 2024
            <br />
            Last Updated: 1st December 2024
          </p>
        </div>
        <span className="text-ink-90 text-body leading-[20px] tracking-wider font-normal">
          Welcome to Vibaar! These Terms of Service ("Terms") govern your
          access to and use of the Vibaar platform, including our website,
          mobile application, and related services (collectively, the
          "Platform"). By accessing or using the Platform, you agree to be bound
          by these Terms. If you do not agree with these Terms, please do not
          use the Platform.
        </span>
        <div className="text-ink-90 text-body-sm leading-[16px] tracking-wider font-normal pb-20">
          <span className="font-bold text-base">1. Overview of Vibaar</span>
          <br />
          <br />
          Vibaar is an online platform that connects social media vendors
          ("Vendors") with buyers ("Buyers") to facilitate seamless e-commerce
          transactions. Vendors can set up and manage storefronts, while Buyers
          can browse, shop, and manage orders. <br />
          <br />
          <span className="font-bold text-base">
            2. Account Registration
          </span>{" "}
          <br />
          <br />
          <span className="font-bold text-sm">2.1 Eligibility</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be at least 18 years old to create an account.</li>
            <li>
              By creating an account, you represent that all information you
              provide is accurate and complete.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">2.2 Account Types</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Vendor Accounts:</b> For users who wish to sell products.
              Vendors are responsible for managing their storefronts, product
              listings, and fulfilling orders.
            </li>
            <li>
              <b>Buyer Accounts:</b> For users who wish to purchase products.
              Buyers can browse vendors, create wishlists, and place orders.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">2.3 Account Security</span>
          <br />
          <br />
          You are responsible for maintaining the confidentiality of your
          account credentials. Vibaar is not liable for any unauthorized
          access to your account. <br />
          <br />
          <span className="font-bold text-base">3. Use of the Platform</span>
          <br />
          <br />
          <span className="font-bold text-sm">3.1 Vendor Responsibilities</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Vendors must provide accurate product descriptions, pricing, and
              availability.
            </li>
            <li>
              Vendors are responsible for fulfilling orders promptly and
              ensuring product quality.
            </li>
            <li>
              Prohibited items include, but are not limited to, counterfeit
              goods, illegal substances, and restricted items.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">3.2 Buyer Responsibilities</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Buyers must provide accurate shipping and payment information.
            </li>
            <li>Buyers agree to respect Vendors' terms and policies.</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">3.3 Acceptable Use</span>
          <br />
          <br />
          You agree not to: <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>Use the Platform for illegal or unauthorized purposes.</li>
            <li>Misrepresent your identity or affiliation.</li>
            <li>Upload harmful or malicious content.</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">
            4. Transactions and Payments
          </span>
          <br />
          <br />
          <span className="font-bold text-sm">4.1 Payment Processing</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>Payments are processed through Paystasck.</li>
            <li>
              By making a purchase, you authorize Vibaar and our payment
              processor to charge your payment method.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">4.2 Fees and Commissions</span>
          <br />
          <br />
          Vibaar may charge a commission or transaction fee for sales made
          through the Platform. Details will be provided during Vendor
          onboarding. <br />
          <br />
          <span className="font-bold text-sm">4.3 Refund Policy</span>
          <br />
          <br />
          Buyers must contact Vendors directly for refund requests. Vibaar
          may mediate disputes but is not responsible for issuing refunds.
          <br />
          <br />
          <span className="font-bold text-base">5. Shipping and Delivery</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Vendors are responsible for shipping products. Delivery timelines
              and costs are set by individual Vendors.
            </li>
            <li>
              Vibaar is not liable for delays or issues caused by third-party
              delivery services.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">6. User-Generated Content</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Vendors and Buyers may upload content (e.g., product images,
              reviews).
            </li>
            <li>
              You retain ownership of your content but grant Vibaar a
              non-exclusive, royalty-free license to use, display, and
              distribute your content for platform operations and marketing
              purposes.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">
            7. Privacy and Data Protection
          </span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Vibaar collects and processes personal data in accordance with
              our Privacy Policy.
            </li>
            <li>We do not sell user data to third parties.</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">8. Dispute Resolution</span>
          <br />
          <br />
          <span className="font-bold text-sm">8.1 Buyer-Vendor Disputes</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Vibaar encourages Buyers and Vendors to resolve disputes
              directly.
            </li>
            <li>
              If a resolution cannot be reached, Vibaar may offer mediation
              but does not guarantee a specific outcome.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">8.2 Platform Disputes</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Any disputes with Vibaar will be governed by the laws of [your
              country/state].
            </li>
            <li>
              You agree to resolve any disputes through binding arbitration in
              [your jurisdiction].
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">
            9. Termination of Accounts
          </span>
          <br />
          <br />
          Vibaar reserves the right to suspend or terminate accounts that
          violate these Terms. Terminated accounts may lose access to all data
          and services.
          <br />
          <br />
          <span className="font-bold text-base">
            10. Limitation of Liability
          </span>
          <br />
          <br />
          Vibaar is not liable for:
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Losses or damages resulting from transactions between Buyers and
              Vendors.
            </li>
            <li>
              Service interruptions or technical issues beyond our control.
            </li>
            <li>
              Indirect or incidental damages arising from the use of the
              Platform.
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">11. Intellectual Property</span>
          <br />
          <br />
          All content on the Platform (excluding user-generated content) is the
          property of Vibaar or its licensors. You may not copy, distribute,
          or use our content without explicit permission.
          <br />
          <br />
          <span className="font-bold text-base">
            12. Changes to These Terms
          </span>
          <br />
          <br />
          We may update these Terms from time to time. You will be notified of
          significant changes, and continued use of the Platform after changes
          constitutes acceptance of the new Terms.
          <br />
          <br />
          <span className="font-bold text-base">13. Contact Information</span>
          <br />
          <br />
          For questions or concerns about these Terms, please contact us at:{" "}
          <br />
          <b>Email:</b> [Insert Contact Email] <br />
          <br />
          <b>Address:</b> [Insert Company Address] <br />
          <br />
          <span className="font-bold text-base">Acknowledgement</span> <br />
          <br />
          By using Vibaar, you acknowledge that you have read, understood,
          and agree to be bound by these Terms of Service.
        </div>
      </div>
    </div>
  );
}
