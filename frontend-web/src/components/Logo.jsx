export default function Logo({ size = 30 }) {
  return (
    <svg
      width={size * 1.4}
      height={size}
      viewBox="0 0 66 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="16,2 26,16 6,16" />
      <polygon points="16,11 29,26 3,26" />
      <polygon points="16,20 32,38 0,38" />
      <rect x="14" y="38" width="4" height="8" />
      <polygon points="34,28 49,14 64,28" />
      <path fillRule="evenodd" d="M37 28 H61 V46 H37 Z M46 36 H52 V46 H46 Z" />
    </svg>
  );
}