'use client';
import React from 'react';
import HeroSection from './components/HeroSection';

export default function LandingPage() {
  return (
    <div className="landing-page relative w-full h-screen overflow-y-scroll" style={{ scrollBehavior: 'smooth' }}>
      <main className="relative w-full">
        <HeroSection />
      </main>
    </div>
  );
}
