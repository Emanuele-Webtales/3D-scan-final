import React, { useEffect } from "react"
import { balloons } from "https://esm.sh/balloons-js"
import { RenderTarget } from "framer"

/**
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 200
 *
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function Balloon() {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    useEffect(() => {
        if (!isCanvas) {
            balloons()
        }
    }, [isCanvas])

    return <> </>
}

Balloon.displayName = "Balloon Dev"
