/* eslint-disable react/no-unescaped-entities */
"use client";

import { useRouter } from "next/navigation";
import React from "react";

const Page = () => {
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
            Privacy policy
          </p>
        </div>

        <div className="space-y-5 border-b border-b-ink-10 pb-6">
          <div className="text-display font-medium leading-[45px] text-black">
            Vibaar
            <br />
            Privacy Policy
          </div>
          <p className="text-ink-90 text-body-sm leading-[16px] font-normal">
            Effective Date: 1st December 2024
            <br />
            Last Updated: 1st December 2024
          </p>
        </div>

        <span className="text-ink-90 text-body leading-[20px] tracking-wider font-normal">
          Welcome to Vibaar! Your privacy is important to us. This Privacy
          Policy explains how Vibaar ("we", "us", or "our") collects, uses,
          discloses and protects your personal information when you use our
          platform, website, and mobile application (collectively, the
          "Platform"). By accessing or using the Platform, you agree to the
          terms outlined in this policy.
        </span>

        <div className="text-ink-90 text-body-sm leading-[16px] tracking-wider font-normal pb-20">
          <span className="font-bold text-base">1. Information We Collect</span>
          <br />
          <br />
          We collect various types of information to provide and improve our
          services. This includes:
          <br />
          <br />
          <span className="font-bold text-sm">1.1 Personal Information</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Shipping and billing addresses</li>
            <li>
              Payment information (processed securely by third-party providers)
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">
            1.2 Account and Authentication Information
          </span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Vendor Accounts:</b>Business names, store details, product
              information.
            </li>
            <li>
              <b>Customer Accounts:</b>Purchase history, wishlist items and
              preferences
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">
            1.3 Automatically Collected Information
          </span>
          <br />
          <br />
          We automatically collect certain information when you use the
          Platform:
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Device information:</b>IP address, browser type, operating
              system.
            </li>
            <li>
              <b>Usage data:</b> Pages visited, actions taken and time spent on
              the Platform
            </li>
            <li>
              <b>Cookies and tracking technologies:</b> For more details, see
              our Cookie Policy
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">1.4 User-Generated Content</span>
          <br />
          <br />
          Any content you upload, such as product images, reviews or profile
          details.
          <br />
          <br />
          <span className="font-bold text-base">
            2. How We Use Your Information
          </span>
          <br />
          <br />
          We use the information we collect for various purposes including:
          <br />
          <br />
          <span className="font-bold text-sm">2.1 Providing Services</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li> To create and manage your account</li>
            <li>To process transactions and fulfill orders</li>
            <li>To facilitate communications between Buyers and Vendors</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">2.2 Improving Our Platform</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>To analyze usage and improve our services</li>
            <li>To develop new features and functionality</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">2.3 Customer Support</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>To respond to your inquiries and provide support</li>
            <li>To resolve dispute and address technical issues</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">
            2.4 Marketing and Communications
          </span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              To send promotional emails, newsletters, and updates(with your
              consent)
            </li>
            <li>To display personalized content and product recommendations</li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-sm">2.5 Legal Compliance</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>To comply with applicable laws and regulations</li>
            <li>
              To prevent fraud, abuse, and unauthorized access to our Platform
            </li>
          </ul>
          <br />
          <br />
          <span className="font-bold text-base">
            3. Sharing Your Information
          </span>
          <br />
          <br />
          We do not sell your personal data. However, we may share your
          information with:
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              With service providers and partners who assist in our operations
            </li>
            <li>For legal reasons or to protect rights and safety</li>
            <li>
              In connection with business transfers like mergers or acquisitions
            </li>
          </ul>
          <br />
          <span className="font-bold text-sm">3.1 Vendors and Buyers</span>
          <br />
          <br />
          We may share information necessary to compare transactions (e.g.
          shopping details) between vendors and buyers.
          <br />
          <br />
          <span className="font-bold text-sm">3.2 Service Providers</span>
          <br />
          <br />
          Third-party partners who assist with payment processing, data
          analysis, customer support and other services.
          <br />
          <br />
          <span className="font-bold text-sm">3.3 Legal Providers</span>
          <br />
          <br />
          If required by law or to protect our rights, we may disclose
          information to law enforcement or regulatory authorities.
          <br />
          <br />
          <span className="font-bold text-sm">3.4 Business Transfers</span>
          <br />
          <br />
          In the event of a merger, acquisition, or sale of personal assets,
          your information may be transferred to the new owner.
          <br />
          <br />
          <span className="font-bold text-base">4. Data Security</span>
          <br />
          <br />
          We take reasonable measures to protect your personal information from
          unauthorized access, disclosure, or destruction. However, no method of
          transmission over the internet is completely secure, and we cannot
          guarantee absolute security.
          <br />
          <br />
          <span className="font-bold text-sm">Security Measures</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>Data encryption</li>
            <li>Secure server infrastructure</li>
            <li>Access controls and monitoring</li>
          </ul>
          <br />
          <span className="font-bold text-base">
            5. Your Rights and Choices
          </span>
          <br />
          <br />
          Depending on your location, you may have the following rights
          regarding your personal data:
          <br />
          <br />
          <span className="font-bold text-sm">5.1 Data Deletion</span>
          <br />
          <br />
          You may request the deletion of your account and personal data,
          subject to certain legal obligations.
          <br /> <br />
          <span className="font-bold text-sm">
            5.2 Data Access and Correction
          </span>
          <br />
          <br />
          You may request access to your personal data and correct any
          inaccuracies.
          <br />
          <br />
          <span className="font-bold text-sm">
            5.3 Opt-out of Marketing Communications
          </span>
          <br />
          <br />
          You can unsubscribe from marketing emails by following the
          instructions in each email.
          <br />
          <br />
          <span className="font-bold text-sm">5.4 Data Portability</span>
          <br />
          <br />
          You may request a copy of your personal data in a structured,
          machine-readable format.
          <br />
          <br />
          <span className="font-bold text-base">
            6. Cookies and Tracking Technologies
          </span>
          <br />
          <br />
          We use cookies and similar technologies to collect usage data and
          enhance your experience on our Platform.
          <br />
          <br />
          <span className="font-bold text-sm">6.1 Types of Cookies</span>
          <br />
          <br />
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Essential Cookies:</span> Required
              for basic functionality
            </li>
            <li>
              <span className="font-medium">Analytics Cookies:</span> Help us
              understand how users interact with our Platform
            </li>
            <li>
              <span className="font-medium">Marketing Cookies:</span> Used to
              deliver targeted ads
            </li>
          </ul>
          <br />
          For more details, please see our Cookie Policy.
          <br />
          <br />
          <span className="font-bold text-base">7. Third-Party Services</span>
          <br />
          <br />
          Our Platform may contain links to third-party websites or services. We
          are not responsible for the privacy practices of these third parties.
          Please review their privacy policies before providing any personal
          information.
          <br />
          <br />
          <span className="font-bold text-base">8. Children's Privacy</span>
          <br />
          <br />
          Our Platform is not intended for use by children under 13. We do not
          knowingly collect their personal data.
          <br />
          <br />
          <span className="font-bold text-base">
            9. International Data Transfers
          </span>
          <br />
          <br />
          We may process your information outside of your country of residence
          and take steps to ensure its protection in accordance with applicable
          data protection laws.
          <br />
          <br />
          <span className="font-bold text-base">
            10. Changes to this Privacy Policy
          </span>
          <br />
          <br />
          We may update this Privacy Policy from time to time. We will notify
          users of material changes by posting a notice on our Platform or via
          email.
          <br />
          <br />
          <span className="font-bold text-base">11. Contact Us</span>
          <br />
          <br />
          If you have any questions about this Privacy Policy, please contact us
          at:
          <br />
          <b>Email:</b> hellogetinstashop@gmail.com <br />
          <br />
          <span className="font-bold text-base">Acknowledgement</span> <br />
          <br />
          By using instashop you acknowledge that you have read , understood and
          agree to the terms of the Privacy Policy
        </div>
      </div>
    </div>
  );
};

export default Page;
