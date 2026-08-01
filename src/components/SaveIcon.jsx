export default function SaveIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      style={{ display: 'inline' }}
    >
      {/* Diskette */}
      <rect x="2" y="2" width="20" height="20" rx="2" fill="white" />
      {/* Dunkler Bereich oben */}
      <rect x="2" y="2" width="20" height="4" fill="#0B4F6C" />
      {/* Slot */}
      <rect x="6" y="7" width="12" height="2" fill="#0B4F6C" />
      {/* Hauptbereich */}
      <rect x="3" y="10" width="18" height="10" fill="#0B4F6C" opacity="0.3" />
    </svg>
  )
}
