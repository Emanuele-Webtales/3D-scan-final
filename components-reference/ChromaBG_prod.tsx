import { useEffect, useRef } from "react"
import { RenderTarget, addPropertyControls, ControlType } from "framer"

/**
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicHeight 400
 * @framerIntrinsicWidth 800
 */
export default function UnicornStudioEmbed({ projectId }) {
    const elementRef = useRef(null)

    useEffect(() => {
        const isEditingOrPreviewing = ["CANVAS", "PREVIEW"].includes(
            RenderTarget.current()
        )

        const initializeScript = (callback) => {
            const existingScript = document.querySelector(
                'script[src^="https://cdn.unicorn.studio"]'
            )
            if (!existingScript) {
                const script = document.createElement("script")
                script.src =
                    "https://cdn.unicorn.studio/v1.2.3/unicornStudio.umd.js"
                script.onload = callback
                document.head.appendChild(script)
            } else {
                callback()
            }
        }

        const initializeUnicornStudio = () => {
            const cacheBuster = isEditingOrPreviewing
                ? "?update=" + Math.random()
                : ""
            elementRef.current.setAttribute(
                "data-us-project",
                projectId + cacheBuster
            )

            if (window.UnicornStudio) {
                window.UnicornStudio.destroy()
                window.UnicornStudio.init().then((scenes) => {
                    console.log(scenes)
                })
            }
        }

        if (projectId) {
            if (window.UnicornStudio) {
                initializeUnicornStudio()
            } else {
                initializeScript(initializeUnicornStudio)
            }
        }
    }, [projectId])

    return (
        <div
            ref={elementRef}
            data-us-dpi="1"
            data-us-scale="1"
            data-us-fps="60"
            style={{ width: "100%", height: "100%" }}
        ></div>
    )
}

UnicornStudioEmbed.displayName = "Chroma Background"

addPropertyControls(UnicornStudioEmbed, {
    projectId: {
        type: ControlType.Enum,
        title: "Style",
        options: [
            "lHlDvoJDIXCxxXVqTNOC",
            "YnADGzDD7LGB9cUocyyN",
            "ezEDNzFtrAgm8yCUWUeX",
            "wYI4YirTR5lrja86ArSY",
            "rJ39y9Nnyz3cJooDtmNM",
            "HJKVa10sftexJ7OgsOnU",
        ],
        optionTitles: ["Liquid", "Folds", "Smoke", "Flow", "Pixel", "ASCII"],
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})
