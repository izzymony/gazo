'use client';
import React from 'react';
import HeroSection from '@/app/(marketing)/landing/components/HeroSection';

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-y-scroll" style={{ scrollBehavior: 'smooth' }}>
      <main className="relative w-full z-0">
        <HeroSection />
      </main>
    </div>
  );
}
