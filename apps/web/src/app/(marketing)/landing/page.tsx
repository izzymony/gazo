// P7: server component — the page shell holds no client state; the interactive
// bits live inside HeroSection (its own client island).
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
