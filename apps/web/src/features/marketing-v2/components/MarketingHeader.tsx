"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { marketingContent } from "../content";
import { useHeaderAutoHide } from "./useHeaderAutoHide";
import styles from "../MarketingSite.module.css";

export default function MarketingHeader() {
  const { header } = marketingContent;
  const headerRef = useRef<HTMLElement>(null);
  const isHidden = useHeaderAutoHide(headerRef);

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
          <nav aria-label="Primary navigation">
            <Link className={styles.headerAction} href="/signup">
              {header.primaryAction}
              <span aria-hidden="true">↗</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
