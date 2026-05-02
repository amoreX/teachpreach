import { createContext, useContext, useState, useEffect, useCallback } from "react"

const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} })

const STORAGE_KEY = "tp_theme"

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === "light" ? "light" : "dark"
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "light") {
      root.setAttribute("data-theme", "light")
    } else {
      root.removeAttribute("data-theme")
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

/**
 * Returns resolved theme colors for use in canvas/non-CSS contexts.
 * Reads from CSS custom properties so they stay in sync.
 */
export function getThemeColors() {
  const style = getComputedStyle(document.documentElement)
  const get = (name) => style.getPropertyValue(name).trim()
  return {
    canvasBg: get("--canvas-bg"),
    dotGrid: get("--dot-grid"),
    penStroke: get("--pen-stroke"),
    selectionBg: get("--selection-bg"),
    textPrimary: get("--text-primary"),
    interactive: get("--interactive"),
  }
}
