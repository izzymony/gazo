"use client";

import Image from "next/image";
import styles from "../MarketingSite.module.css";

type BuyerProduct = {
  readonly store: string;
  readonly category: string;
  readonly title: string;
  readonly price: string;
  readonly image: string;
};

type BuyerRailProps = {
  readonly products: readonly BuyerProduct[];
};

function ProductCard({
  product,
  companion,
  duplicate = false,
}: {
  readonly product: BuyerProduct;
  readonly companion: BuyerProduct;
  readonly duplicate?: boolean;
}) {
  return (
    <article className={styles.discoveryCard}>
      <div className={styles.discoveryBackdrop} aria-hidden="true">
        <Image
          alt=""
          fill
          sizes="300px"
          src={product.image}
        />
      </div>
      <div className={styles.discoveryShade} aria-hidden="true" />

      <header className={styles.discoveryStore}>
        <span aria-hidden="true">{product.store.slice(0, 1)}</span>
        <div>
          <strong>{product.store}</strong>
          <small>{product.category}</small>
          <small>Protected checkout</small>
        </div>
        <span className={styles.storeStatus}>View store <b aria-hidden="true">›</b></span>
      </header>

      <div className={styles.discoveryProducts}>
        {[product, companion].map((item) => (
          <div className={styles.discoveryProduct} key={`${product.store}-${item.title}`}>
            <div className={styles.discoveryProductImage}>
              <Image
                alt={duplicate ? "" : item.title}
                fill
                sizes="54px"
                src={item.image}
              />
            </div>
            <div className={styles.discoveryProductCopy}>
              <p>{item.title}</p>
              <small><span aria-hidden="true">★</span> Curated pick</small>
              <strong>{item.price}</strong>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

/**
 * The rail's motion is now entirely a CSS question — it runs only while its own
 * scene is settled and its slide is current, and stops for hover, focus and
 * reduced motion. That removed an IntersectionObserver and a matchMedia
 * listener per rail: the shared journey controller already knows which scene is
 * on screen, so the rail does not need to work it out again.
 */
export default function BuyerRail({ products }: BuyerRailProps) {
  return (
    <div
      aria-label="Illustrative preview of invented stores and products on Vibaar"
      className={styles.buyerRail}
      role="group"
      tabIndex={0}>
      <div className={styles.buyerRailTrack}>
        <div className={styles.buyerRailSet}>
          {products.map((product, index) => (
            <ProductCard
              companion={products[(index + 1) % products.length]}
              key={product.title}
              product={product}
            />
          ))}
        </div>
        <div aria-hidden="true" className={styles.buyerRailSet}>
          {products.map((product, index) => (
            <ProductCard
              companion={products[(index + 1) % products.length]}
              duplicate
              key={`duplicate-${product.title}`}
              product={product}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
