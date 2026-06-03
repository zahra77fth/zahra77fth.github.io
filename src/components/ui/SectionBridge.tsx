interface SectionBridgeProps {
  label?: string
}

/** Visual connector between major page blocks */
export function SectionBridge({ label }: SectionBridgeProps) {
  return (
    <div className="section-bridge" aria-hidden>
      <div className="section-bridge__line" />
      {label && <span className="section-bridge__label font-display">{label}</span>}
      <div className="section-bridge__node" />
      <div className="section-bridge__line" />
    </div>
  )
}
