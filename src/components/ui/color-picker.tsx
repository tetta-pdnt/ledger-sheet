"use client"

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({
  value,
  onChange,
}: ColorPickerProps) {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7",
    "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
    "#009688", "#4caf50", "#8bc34a", "#cddc39",
    "#ffeb3b", "#ffc107", "#ff9800", "#ff5722",
    "#795548", "#607d8b",
  ]

  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={`w-8 h-8 rounded-full border ${
            value === color ? "border-primary border-2" : "border-muted"
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}
