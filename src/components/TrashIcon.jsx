export default function TrashIcon({ size = 18, color = '#dc2626' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline' }}
    >
      {/* Mülltonnen-Deckel */}
      <path d="M3 6h18" />
      {/* Mülltonnen-Griff */}
      <path d="M8 6V4c0-.55.45-1 1-1h6c.55 0 1 .45 1 1v2" />
      {/* Mülltonnen-Körper */}
      <path d="M5 6v12c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6" />
      {/* Vertikale Linien */}
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}
