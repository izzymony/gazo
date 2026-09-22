"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useSellerDestination } from "@/hooks/useAuthSnapshot";
import { marketingContent } from "../content";
import { useHeaderAutoHide } from "./useHeaderAutoHide";
import styles from "../MarketingSite.module.css";

export default function MarketingHeader() {
  const { header } = marketingContent;
  const headerRef = useRef<HTMLElement>(null);
  const isHidden = useHeaderAutoHide(headerRef);
  // Resolves to signed-out on the server and through hydration, then to the
  // truth. See useAuthSnapshot for why it cannot simply read the store.
  const { href, isSignedIn } = useSellerDestination();

  return (
    <header
      className={styles.header}
      data-hidden={isHidden ? "true" : "false"}
      ref={headerRef}
    >
      <div className={styles.headerInner}>
        <div className={styles.headerBrand}>
          <Link className={styles.logoLink} href="/" aria-label="Vibaar home">
            <Image
              alt="Vibaar"
              className={styles.logo}
              height={40}
              priority
              src="/brand/logo-yellow.svg"
              width={139}
            />
          </Link>
          <span className={styles.betaPill}>{header.beta}</span>
        </div>

        <div className={styles.headerEnd}>
          <nav aria-label="Primary navigation" className={styles.headerNav}>
            {/* The way back in, and the one thing the header was missing:
                its only control sent everyone to sign-up, which clears the
                session on mount — so a returning seller was signed out by
                the button meant to bring them back. Tertiary, because a
                second bounded control beside the primary would read as a
                choice between equals. Gone once signed in, where it would
                only offer to end the session. */}
            {!isSignedIn && (
              <Link className={styles.headerLogin} href="/signin">
                {header.login}
              </Link>
            )}
            <Link className={styles.headerAction} href={href}>
              {isSignedIn ? header.signedInAction : header.primaryAction}
              <span aria-hidden="true" className={styles.headerActionArrow}>
                ↗
              </span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
