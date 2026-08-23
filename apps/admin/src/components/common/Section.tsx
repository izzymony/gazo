interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

export default function Section({ children, className = "" }: SectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      {children}
    </div>
  );
}