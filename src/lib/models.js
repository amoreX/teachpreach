const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"

const PREFERRED_IDS = new Set([
  "anthropic/claude-opus-4.6-fast",
  "anthropic/claude-opus-4.7",
  "anthropic/claude-sonnet-4.6",
  "~anthropic/claude-sonnet-latest",
  "~anthropic/claude-opus-latest",
  "~anthropic/claude-haiku-latest",
  "openai/gpt-5.5",
  "openai/gpt-5.5-pro",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-flash",
  "~google/gemini-pro-latest",
  "~google/gemini-flash-latest",
  "deepseek/deepseek-v4-pro",
  "deepseek/deepseek-v4-flash",
  "x-ai/grok-4.3",
  "qwen/qwen3.6-max-preview",
])

function parseModel(raw) {
  const params = raw.supported_parameters || []
  return {
    id: raw.id,
    name: raw.name,
    contextLength: raw.context_length,
    maxOutput: raw.top_provider?.max_completion_tokens || null,
    pricing: {
      prompt: parseFloat(raw.pricing?.prompt || "0"),
      completion: parseFloat(raw.pricing?.completion || "0"),
    },
    supportsReasoning: params.includes("reasoning"),
    supportsReasoningEffort: params.includes("reasoning_effort"),
    supportsIncludeReasoning: params.includes("include_reasoning"),
    supportsTools: params.includes("tools"),
    supportedParameters: params,
  }
}

function groupByProvider(models) {
  const groups = {}
  for (const m of models) {
    const slash = m.id.indexOf("/")
    let provider = slash > 0 ? m.id.slice(0, slash) : "other"
    provider = provider.replace(/^~/, "")

    const label = provider.charAt(0).toUpperCase() + provider.slice(1)
    if (!groups[label]) groups[label] = []
    groups[label].push(m)
  }

  const order = ["Anthropic", "Openai", "Google", "Deepseek", "X-ai", "Qwen"]
  const sorted = {}
  for (const key of order) {
    if (groups[key]) {
      sorted[key] = groups[key]
      delete groups[key]
    }
  }
  for (const key of Object.keys(groups).sort()) {
    sorted[key] = groups[key]
  }
  return sorted
}

export async function fetchModels() {
  const res = await fetch(OPENROUTER_MODELS_URL)
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`)
  const json = await res.json()
  const all = (json.data || []).map(parseModel)

  const preferred = all.filter((m) => PREFERRED_IDS.has(m.id))
  const grouped = groupByProvider(preferred)

  return { all, preferred, grouped }
}

export const EFFORT_LEVELS = [
  { value: "low", label: "LOW", description: "Fast, minimal reasoning" },
  { value: "medium", label: "MED", description: "Balanced" },
  { value: "high", label: "HIGH", description: "Deep reasoning" },
]

export const DEFAULT_MODEL = "anthropic/claude-opus-4.6-fast"
export const DEFAULT_EFFORT = "low"
