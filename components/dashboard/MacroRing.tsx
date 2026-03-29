'use client'

interface MacroRingProps {
  value: number
  max: number
  size?: number
  color?: string
  label: string
  sublabel?: string
}

export default function MacroRing({ value, max, size = 80, color = '#111827', label, sublabel }: MacroRingProps) {
  const pct = Math.min(value / max, 1)
  const r = (size - 10) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const strokeDashoffset = circumference * (1 - pct)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={6}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={pct >= 1 ? '#22c55e' : color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-medium text-gray-900 leading-none">{label}</span>
        {sublabel && <span className="text-xs text-gray-400 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  )
}
