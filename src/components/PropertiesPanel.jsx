import { Trash2 } from "lucide-react"

const FIELD_CONFIG = {
  rectangle: [
    { key: "x", label: "X", type: "number" },
    { key: "y", label: "Y", type: "number" },
    { key: "width", label: "W", type: "number" },
    { key: "height", label: "H", type: "number" },
    { key: "fill", label: "FILL", type: "color" },
    { key: "stroke", label: "STROKE", type: "color" },
    { key: "strokeWidth", label: "STROKE W", type: "number" },
  ],
  circle: [
    { key: "x", label: "X", type: "number" },
    { key: "y", label: "Y", type: "number" },
    { key: "radius", label: "R", type: "number" },
    { key: "fill", label: "FILL", type: "color" },
    { key: "stroke", label: "STROKE", type: "color" },
    { key: "strokeWidth", label: "STROKE W", type: "number" },
  ],
  line: [
    { key: "x1", label: "X1", type: "number" },
    { key: "y1", label: "Y1", type: "number" },
    { key: "x2", label: "X2", type: "number" },
    { key: "y2", label: "Y2", type: "number" },
    { key: "color", label: "COLOR", type: "color" },
    { key: "width", label: "WIDTH", type: "number" },
  ],
  text: [
    { key: "x", label: "X", type: "number" },
    { key: "y", label: "Y", type: "number" },
    { key: "text", label: "TEXT", type: "text" },
    { key: "fontSize", label: "SIZE", type: "number" },
    { key: "color", label: "COLOR", type: "color" },
  ],
  path: [
    { key: "color", label: "COLOR", type: "color" },
    { key: "width", label: "WIDTH", type: "number" },
    { key: "fill", label: "FILL", type: "color" },
  ],
}

export default function PropertiesPanel({ element, onUpdate, onDelete }) {
  if (!element) return null

  const fields = FIELD_CONFIG[element.type] || []

  const handleChange = (key, value, type) => {
    let parsed = value
    if (type === "number") {
      parsed = parseFloat(value)
      if (isNaN(parsed)) return
    }
    onUpdate(element.id, { [key]: parsed })
  }

  return (
    <div className="border-t border-[#222] px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#999]">
          {element.type} #{element.id}
        </span>
        <button
          onClick={() => onDelete(element.id)}
          className="p-1 text-[#666] hover:text-[#D71921] transition-colors cursor-pointer"
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "text" ? "col-span-2" : ""}
          >
            <label className="block font-mono text-[9px] tracking-[0.1em] uppercase text-[#666] mb-0.5">
              {field.label}
            </label>
            {field.type === "color" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={element[field.key] || "#E8E8E8"}
                  onChange={(e) => handleChange(field.key, e.target.value, "color")}
                  className="w-5 h-5 rounded border border-[#333] bg-transparent cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded"
                />
                <input
                  type="text"
                  value={element[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value, "color")}
                  placeholder="none"
                  className="flex-1 bg-transparent border-b border-[#333] text-[12px] font-mono text-[#e8e8e8] py-0.5 focus:outline-none focus:border-[#666] placeholder:text-[#333]"
                />
              </div>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={element[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                className="w-full bg-transparent border-b border-[#333] text-[12px] font-mono text-[#e8e8e8] py-0.5 focus:outline-none focus:border-[#666]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
