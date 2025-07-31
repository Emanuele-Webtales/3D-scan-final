import { useState } from "react"
import { addPropertyControls, ControlType } from "framer"

/*
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

export default function Book(props) {
    const {
        image,
        title,
        backgroundColor,
        textColor,
        font,
        variant,
        filter,
        widthContent,
    } = props

    const height = widthContent * 5
    const maxTitleHeight = height * 0.9
    const widthImage = widthContent * 4

    const widthButton = widthContent + widthImage

    const buttonStyle = {
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        outline: "none",
        flexShrink: 0,
        width: `${widthButton}px`,
        perspective: "1000px",
        gap: "0px",
        transition: "all 500ms ease 0s",
        willChange: "auto",
        transform: "translateX(0px)",
        marginLeft: `${
            calculateMargin(widthContent, variant ? 65 : 30) - widthContent
        }px`,
        marginRight: `${
            calculateMargin(widthImage, variant ? 30 : 81) - widthImage
        }px`,
    }

    const contentStyle = {
        transformStyle: "preserve-3d",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        flexShrink: 0,
        width: `${widthContent}px`,
        height: `${height}px`,
        transformOrigin: "right center",
        backgroundColor: backgroundColor,
        color: textColor,
        transform: variant ? "rotateY(-65deg)" : "rotateY(-30deg)",
        transition: "all 500ms ease 0s",
        willChange: "auto",
        filter: "brightness(0.8) contrast(2)",
        userSelect: "none",
    }

    const imageContainerStyle = {
        transformStyle: "preserve-3d",
        position: "relative",
        flexShrink: 0,
        overflow: "hidden",
        transformOrigin: variant ? "left center" : "left",
        transform: variant ? "rotateY(30deg)" : "rotateY(81deg)",
        transition: "all 500ms ease 0s",
        willChange: "auto",
        filter: "brightness(0.8) contrast(2)",
        userSelect: "none",
    }

    const titleStyle = {
        writingMode: "vertical-rl",
        marginTop: "12px",
        userSelect: "none",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxHeight: `${maxTitleHeight}px`,
    }

    const filterContentStyle = {
        pointerEvents: "none",
        position: "fixed",
        zIndex: "50",
        height: `${height}px`,
        width: "100%",
        opacity: "0.4",
        filter: filter ? 'url("#paper")' : "",
        userSelect: "none",
    }

    const filterImageStyle = {
        pointerEvents: "none",
        position: "fixed",
        zIndex: "50",
        height: `${height}px`,
        width: `${widthImage}px`,
        opacity: "0.4",
        filter: filter ? 'url("#paper")' : "",
        userSelect: "none",
    }

    const shadowStyle = {
        pointerEvents: "none",
        userSelect: "none",
        position: "absolute",
        top: "0px",
        left: "0px",
        zIndex: "50",
        height: `${height}px`,
        width: `${widthImage}px`,
        background:
            "linear-gradient(to right, rgba(255, 255, 255, 0) 2px, rgba(255, 255, 255, 0.5) 3px, rgba(255, 255, 255, 0.25) 4px, rgba(255, 255, 255, 0.25) 6px, transparent 7px, transparent 9px, rgba(255, 255, 255, 0.25) 9px, transparent 12px)",
    }

    const imageStyle = {
        transition: "all 500ms ease 0s",
        willChange: "auto",
        width: `${widthImage}px`,
        height: `${height}px`,
        maxHeight: "100%",
        userSelect: "none",
    }

    return (
        <div>
            <svg
                style={{ position: "absolute", inset: 0, visibility: "hidden" }}
            >
                <defs>
                    <filter id="paper" x="0%" y="0%" width="100%" height="100%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="1"
                            numOctaves="8"
                            result="noise"
                        ></feTurbulence>
                        <feDiffuseLighting
                            in="noise"
                            lightingColor="white"
                            surfaceScale="1"
                            result="diffLight"
                        >
                            <feDistantLight
                                azimuth="45"
                                elevation="35"
                            ></feDistantLight>
                        </feDiffuseLighting>
                    </filter>
                </defs>
            </svg>
            <div style={buttonStyle}>
                <div style={contentStyle}>
                    <span style={filterContentStyle}></span>
                    <h2 style={{ ...font, ...titleStyle }}>{title}</h2>
                </div>

                <div style={imageContainerStyle}>
                    <span style={filterImageStyle}></span>
                    <span style={shadowStyle}></span>
                    <img
                        alt={
                            image && image.alt
                                ? image.alt
                                : defaultProperty.image.alt
                        }
                        src={image ? image.src : defaultProperty.image.src}
                        style={imageStyle}
                    />
                </div>
            </div>
        </div>
    )
}

addPropertyControls(Book, {
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    title: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "Think And Grow Rich",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background Color",
        defaultValue: "rgb(255, 202, 126)",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text Color",
        defaultValue: "rgb(8, 21, 59)",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        defaultValue: "Inter",
        controls: "extended",
    },
    variant: {
        type: ControlType.Boolean,
        title: "Variant",
        enabledTitle: "Open",
        disabledTitle: "Close",
    },
    filter: {
        type: ControlType.Boolean,
        title: "Filter",
        enabledTitle: "With",
        disabledTitle: "Without",
    },
    widthContent: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 50,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

const defaultProperty = {
    image: {
        src: "https://framerusercontent.com/images/l5lP01syB8XZqU1kYdWFfQ5fGX0.png",
        srcSet: "https://framerusercontent.com/images/l5lP01syB8XZqU1kYdWFfQ5fGX0.png 401w",
        alt: "Think And Grow Rich",
    },
}

Book.displayName = "3D Book"

const calculateMargin = (width, rotationAngle) => {
    var radians = (rotationAngle * Math.PI) / 180

    var horizontalDisplacement = width * Math.cos(radians)

    return horizontalDisplacement
}
