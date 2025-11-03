interface ResearcherIconProps {
  size?: number;
  className?: string;
}

export function ResearcherIcon({ size = 24, className = '' }: ResearcherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.67.5h0a12,12,0,0,1-6,10.59L12,12l-1.67-.91A12,12,0,0,1,4.33.5h0"/>
      <path d="M4.33,23.5h0a12,12,0,0,1,6-10.59L12,12l1.67.91a12,12,0,0,1,6,10.59h0"/>
      <line x1="19.49" y1="3.38" x2="8.17" y2="3.38"/>
      <line x1="18.02" y1="7.21" x2="10.08" y2="7.21"/>
      <line x1="13.92" y1="16.79" x2="5.98" y2="16.79"/>
      <line x1="15.83" y1="20.63" x2="4.51" y2="20.63"/>
    </svg>
  );
}
