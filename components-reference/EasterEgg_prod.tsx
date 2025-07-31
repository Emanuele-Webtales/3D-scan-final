import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * @framerDisableUnlink
 *
 * @framerIntrinsicWidth 100
 * @framerIntrinsicHeight 100
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */

// Function to create the easter egg logic
function EasterEggRedirect(props) {
    // Convert the word sequence string to an array of characters
    const wordSequence = props.wordSequence.split("")

    // State to keep track of the typed keys
    const [typedKeys, setTypedKeys] = React.useState<string[]>([])

    // Event listener to handle keydown
    const handleKeyDown = (e) => {
        // Convert typed key to lowercase
        const typedKey = e.key.toLowerCase()

        // Add the typed key to the array
        const updatedKeys = [...typedKeys, typedKey]

        // Ensure the array length doesn't exceed the word sequence length
        if (updatedKeys.length > wordSequence.length) {
            updatedKeys.shift()
        }

        // Check if the typed keys match the word sequence
        if (wordSequence.every((key, index) => key === updatedKeys[index])) {
            // Check if the redirect URL starts with "https://"
            let redirectUrl = props.redirectUrl
            if (!redirectUrl.startsWith("https://")) {
                // Add "https://" to the beginning of the URL
                redirectUrl = "https://" + redirectUrl
            }

            // Open the link in a new tab or the same tab based on the property value
            if (props.openInNewTab) {
                window.open(redirectUrl, "_blank")
            } else {
                window.location.href = redirectUrl
            }
        }

        // Update the state with the typed keys
        setTypedKeys(updatedKeys)
    }

    // Effect to add and remove the event listener
    React.useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [typedKeys])

    // Render a transparent element with pointer events set to none
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                pointerEvents: "none",
            }}
        />
    )
}

EasterEggRedirect.displayName = "Easter Egg Redirect"

// Add property controls for the word sequence, redirect URL, and open in new tab toggle
addPropertyControls(EasterEggRedirect, {
    wordSequence: {
        title: "Word",
        type: ControlType.String,
        defaultValue: "framer",
        description: "Enter one(!) word that will trigger the redirect.",
    },
    redirectUrl: {
        title: "URL",
        type: ControlType.String,
        defaultValue: "framer.university",
        description: "Enter the URL to redirect to when the word is typed.",
    },
    openInNewTab: {
        title: "New Tab",
        type: ControlType.Boolean,
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
        description:
            "Toggle to open the link in a new tab.\nMore components at [Framer University](https://frameruni.link/cc).",
    },
})

// Export the code component
export default EasterEggRedirect
