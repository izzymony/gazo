import React from 'react';

export const metadata = {
  title: 'myInstaShop - Where Social Meets Shopping',
  description: 'Discover unique products and viral trends from Nigeria\'s hottest IG vendors. Shop, sell, or influence - all in one platform.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
