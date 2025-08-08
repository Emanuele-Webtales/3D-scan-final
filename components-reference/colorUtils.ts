import { RenderTarget } from "framer"
import { useEffect, useState, useMemo } from "react"

const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

export function useColors(...colors: any[]) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const isOptimizing = typeof window === "undefined"

    const darkMode = useDarkMode()
    const [styleValues, setStyleValues] = useState(() =>
        extractStyleValues(colors.map(extractCSSVariableName))
    )

    useEffect(() => {
        if (!isCanvas) return

        const div = document.body.querySelector("main > div")
        if (!div) return

        const observer = new MutationObserver(() => {
            setStyleValues(
                extractStyleValues(colors.map(extractCSSVariableName))
            )
        })

        observer.observe(div, {
            attributes: true,
            attributeFilter: ["style"],
        })

        return () => observer.disconnect()
    }, [colors])

    const variableNames = useMemo(() => colors.map(extractCSSVariableName), [colors])

    if (isOptimizing) {
        return colors.map((color) => extractDefaultValue(color))
    }

    let values: (string | any)[] = []

    for (let i = 0; i < colors.length; i++) {
        const color = colors[i]
        // Return original value if not a string
        if (typeof color !== "string") {
            values.push(color)
            continue
        }

        const variableName = variableNames[i]
        const colorValues = styleValues[variableName]

        if (variableName && colorValues) {
            values.push(
                darkMode
                    ? colorValues.dark || colorValues.light || color
                    : colorValues.light || color
            )
        } else {
            values.push(color)
        }
    }

    return values
}

////////////////////

function extractStyleValues(variableNames: string[]) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const result: { [key: string]: { light: string; dark: string } } = {}

    let lightVars: { [key: string]: string } = {}
    let darkVars: { [key: string]: string } = {}

    if (isCanvas && typeof document !== "undefined") {
        const div = document.body.querySelector("main > div")
        if (div) {
            const style = div.getAttribute("style")
            if (style) {
                const vars = parseVariables(style)
                lightVars = vars
                darkVars = vars
            }
        }
    } else {
        const { light, dark } = extractColorStyles()

        lightVars = parseVariables(light)
        darkVars = parseVariables(dark)
    }

    // Include all variables
    const allVarNames = new Set([
        ...Object.keys(lightVars),
        ...Object.keys(darkVars),
    ])

    allVarNames.forEach((varName) => {
        result[varName] = {
            light: lightVars[varName] || "",
            dark: darkVars[varName] || "",
        }
    })

    return result
}

function extractColorStyles() {
    let lightSection = ""
    let darkSection = ""

    if (typeof document !== "undefined") {
        const styles = document.head.querySelectorAll(
            "style[data-framer-css], style[data-framer-css-ssr], style[data-framer-css-ssr-minified]"
        ) as NodeListOf<HTMLStyleElement>

        for (const style of styles) {
            const rules = style.sheet?.cssRules
            if (!rules) continue

            const styleRules: Array<[CSSStyleRule, boolean]> = []

            for (const rule of rules) {
                if (rule instanceof CSSStyleRule) {
                    styleRules.push([rule, false])
                } else if (rule instanceof CSSMediaRule) {
                    if (rule.conditionText === "(prefers-color-scheme: dark)") {
                        for (const subrule of rule.cssRules) {
                            if (subrule instanceof CSSStyleRule) {
                                styleRules.push([subrule, true])
                            }
                        }
                    }
                }
            }

            for (const [rule, isDarkMedia] of styleRules) {
                const css = rule.cssText
                const hasVars = css.includes("--token-")
                if (!hasVars) continue

                const isDark = isDarkMedia
                    ? rule.selectorText === "body"
                    : rule.selectorText === 'body[data-framer-theme="dark"]'
                const isLight = !isDarkMedia && rule.selectorText === "body"

                if (!isDark && !isLight) continue

                if (isDark) {
                    if (!darkSection) {
                        darkSection = css
                            .substring(
                                css.indexOf("{") + 1,
                                css.lastIndexOf("}")
                            )
                            .trim()
                    }
                } else {
                    if (!lightSection) {
                        lightSection = css
                            .substring(
                                css.indexOf("{") + 1,
                                css.lastIndexOf("}")
                            )
                            .trim()
                    }
                }

                if (darkSection && lightSection) break
            }

            if (darkSection && lightSection) break
        }
    }

    return { light: lightSection, dark: darkSection }
}

export function useDarkMode() {
    const isPreview =
        typeof window !== "undefined" &&
        window.location.origin.endsWith("framercanvas.com")

    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window === "undefined") {
            return false
        } else if (isPreview && typeof document !== "undefined") {
            return document.body.getAttribute("data-framer-theme") === "dark"
        } else {
            return window.matchMedia("(prefers-color-scheme: dark)").matches
        }
    })

    useEffect(() => {
        if (isPreview) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === "data-framer-theme") {
                        const theme =
                            document.body.getAttribute("data-framer-theme")
                        setIsDarkMode(theme === "dark")
                    }
                })
            })

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ["data-framer-theme"],
            })

            return () => observer.disconnect()
        } else {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

            const handleChange = (e: MediaQueryListEvent) => {
                setIsDarkMode(e.matches)
            }

            // Update initial value
            if (mediaQuery.matches !== isDarkMode) {
                setIsDarkMode(mediaQuery.matches)
            }

            mediaQuery.addListener(handleChange)

            return () => mediaQuery.removeListener(handleChange)
        }
    }, [isPreview])

    return isDarkMode
}

function extractCSSVariableName(cssString: string) {
    if (!cssString || !cssString.startsWith("var(")) {
        return ""
    }

    const match = cssVariableRegex.exec(cssString)
    if (match) {
        const variableName = match[1]
        return variableName || ""
    }

    return ""
}

function parseVariables(section: string) {
    const vars: { [key: string]: string } = {}
    if (!section) return vars

    const declarations = section.split(";").filter(Boolean)
    declarations.forEach((declaration) => {
        const [name, value] = declaration.split(":").map((s) => s.trim())
        if (name && value) {
            vars[name] = value
        }
    })
    return vars
}

function extractDefaultValue(cssVar: string) {
    // Check if the string starts with "var("
    if (!cssVar || !cssVar.startsWith("var(")) {
        return cssVar // Return the original value if it doesn't start with "var("
    }

    // Remove "var(" from the beginning and ")" from the end
    const content = cssVar.slice(4, -1)

    // Split the content by comma
    const parts = content.split(",")

    // If there's more than one part, the second part is the default value
    if (parts.length > 1) {
        // Trim any whitespace from the default value
        return parts.slice(1).join(",").trim()
    }

    // If there's no comma, return an empty string or null
    return ""
}
