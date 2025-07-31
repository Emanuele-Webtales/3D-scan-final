import React, { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

// Constants
const PADDLE_HEIGHT = 10
const BALL_RADIUS = 10
const BRICK_ROW_COUNT = 5
const BRICK_COLUMN_COUNT = 7
const BRICK_PADDING = 5
const BALL_SPEED = 400 // pixels per second
const PADDLE_SPEED = 400 // pixels per second

/**
 * @framerDisableUnlink
 */

export default function BricksGame(props) {
    const {
        bgColor,
        paddleColor,
        brickColor,
        startTextColor,
        startTextFontFamily,
        startTextFontSize,
        startText,
        lostTextColor,
        lostTextFontFamily,
        lostTextFontSize,
        lostText,
        winTextColor,
        winTextFontFamily,
        winTextFontSize,
        winText,
        restartTextColor,
        restartTextFontFamily,
        restartTextFontSize,
        restartText,
    } = props

    const canvasRef = useRef(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const [lost, setLost] = useState(false)
    const [won, setWon] = useState(false)
    const [started, setStarted] = useState(false)

    const paddleXRef = useRef(0)
    const ballRef = useRef({ x: 0, y: 0, dx: 1, dy: -1 })
    const bricksRef = useRef([])
    const rightPressedRef = useRef(false)
    const leftPressedRef = useRef(false)

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement
                const width = parent.clientWidth
                const height = parent.clientHeight

                setSize({
                    width,
                    height,
                })
            }
        }

        handleResize()
        const resizeObserver = new ResizeObserver(handleResize)
        if (canvasRef.current) {
            resizeObserver.observe(canvasRef.current)
        }

        return () => {
            if (canvasRef.current) {
                resizeObserver.unobserve(canvasRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (size.width === 0 || size.height === 0) return

        const paddleWidth = size.width / 6
        const brickWidth =
            (size.width - BRICK_PADDING * (BRICK_COLUMN_COUNT + 1)) /
            BRICK_COLUMN_COUNT
        const brickHeight = 20

        paddleXRef.current = (size.width - paddleWidth) / 2
        ballRef.current = {
            x: size.width / 2,
            y: size.height - 30,
            dx: 1,
            dy: -1,
        }
        bricksRef.current = createBricks(size.width, brickWidth, brickHeight)

        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        let animationFrameId
        let lastTime = 0

        const scale = window.devicePixelRatio || 1
        canvas.width = size.width * scale
        canvas.height = size.height * scale
        ctx.scale(scale, scale)

        const render = (currentTime) => {
            if (!lastTime) lastTime = currentTime
            const deltaTime = (currentTime - lastTime) / 1000 // Convert to seconds
            lastTime = currentTime

            ctx.clearRect(0, 0, size.width, size.height)
            drawBricks(ctx, bricksRef.current, brickWidth, brickHeight)
            drawPaddle(ctx, paddleXRef.current, paddleWidth)
            drawBall(ctx, ballRef.current)

            if (lost) {
                drawLostMessage(ctx)
            } else if (won) {
                drawWinMessage(ctx)
            } else if (started) {
                moveBall(paddleWidth, brickWidth, brickHeight, deltaTime)
                movePaddle(paddleWidth, deltaTime)
            } else {
                drawStartMessage(ctx)
            }

            animationFrameId = requestAnimationFrame(render)
        }

        render(performance.now())

        const handleKeyDown = (e) => {
            if (e.key === "Right" || e.key === "ArrowRight") {
                rightPressedRef.current = true
            } else if (e.key === "Left" || e.key === "ArrowLeft") {
                leftPressedRef.current = true
            } else if (e.key === "Enter") {
                if (!started) {
                    startGame()
                } else if (lost || won) {
                    resetGame()
                }
            }
        }

        const handleKeyUp = (e) => {
            if (e.key === "Right" || e.key === "ArrowRight") {
                rightPressedRef.current = false
            } else if (e.key === "Left" || e.key === "ArrowLeft") {
                leftPressedRef.current = false
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("keyup", handleKeyUp)

        if (canvasRef.current) {
            canvasRef.current.focus()
        }

        return () => {
            cancelAnimationFrame(animationFrameId)
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("keyup", handleKeyUp)
        }
    }, [size, lost, won, started])

    const createBricks = (canvasWidth, brickWidth, brickHeight) => {
        let bricks = []
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                const brickX = c * (brickWidth + BRICK_PADDING) + BRICK_PADDING
                const brickY = r * (brickHeight + BRICK_PADDING) + BRICK_PADDING
                bricks.push({ x: brickX, y: brickY, status: 1 })
            }
        }
        return bricks
    }

    const drawBricks = (ctx, bricks, brickWidth, brickHeight) => {
        bricks.forEach((brick) => {
            if (brick.status === 1) {
                ctx.beginPath()
                ctx.rect(brick.x, brick.y, brickWidth, brickHeight)
                ctx.fillStyle = brickColor
                ctx.fill()
                ctx.closePath()
            }
        })
    }

    const drawPaddle = (ctx, paddleX, paddleWidth) => {
        ctx.beginPath()
        ctx.rect(
            paddleX,
            size.height - PADDLE_HEIGHT,
            paddleWidth,
            PADDLE_HEIGHT
        )
        ctx.fillStyle = paddleColor
        ctx.fill()
        ctx.closePath()
    }

    const drawBall = (ctx, ball) => {
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = "#ffffff"
        ctx.fill()
        ctx.closePath()
    }

    const drawStartMessage = (ctx) => {
        ctx.font = `${startTextFontSize}px ${startTextFontFamily}`
        ctx.fillStyle = startTextColor
        ctx.textAlign = "center"
        ctx.fillText(startText, size.width / 2, size.height / 2)
    }

    const drawLostMessage = (ctx) => {
        ctx.font = `bold ${lostTextFontSize}px ${lostTextFontFamily}`
        ctx.fillStyle = lostTextColor
        ctx.textAlign = "center"
        ctx.fillText(lostText, size.width / 2, size.height / 2)

        ctx.font = `${restartTextFontSize}px ${restartTextFontFamily}`
        ctx.globalAlpha = 0.6
        ctx.fillStyle = restartTextColor
        ctx.fillText(restartText, size.width / 2, size.height / 2 + 30)
        ctx.globalAlpha = 1
    }

    const drawWinMessage = (ctx) => {
        ctx.font = `${winTextFontSize}px ${winTextFontFamily}`
        ctx.fillStyle = winTextColor
        ctx.textAlign = "center"
        ctx.fillText(winText, size.width / 2, size.height / 2)

        ctx.font = `${restartTextFontSize}px ${restartTextFontFamily}`
        ctx.globalAlpha = 0.6
        ctx.fillStyle = restartTextColor
        ctx.fillText(restartText, size.width / 2, size.height / 2 + 40)
        ctx.globalAlpha = 1
    }

    const moveBall = (paddleWidth, brickWidth, brickHeight, deltaTime) => {
        const ball = ballRef.current

        ball.x += ball.dx * BALL_SPEED * deltaTime
        ball.y += ball.dy * BALL_SPEED * deltaTime

        if (
            ball.x + ball.dx * BALL_SPEED * deltaTime >
                size.width - BALL_RADIUS ||
            ball.x + ball.dx * BALL_SPEED * deltaTime < BALL_RADIUS
        ) {
            ball.dx = -ball.dx
        }
        if (ball.y + ball.dy * BALL_SPEED * deltaTime < BALL_RADIUS) {
            ball.dy = -ball.dy
        } else if (
            ball.y + ball.dy * BALL_SPEED * deltaTime >
            size.height - BALL_RADIUS - PADDLE_HEIGHT
        ) {
            if (
                ball.x > paddleXRef.current &&
                ball.x < paddleXRef.current + paddleWidth
            ) {
                ball.dy = -ball.dy
            } else {
                setLost(true)
            }
        }

        const bricks = bricksRef.current
        let remainingBricks = 0
        for (let i = 0; i < bricks.length; i++) {
            let brick = bricks[i]
            if (brick.status === 1) {
                remainingBricks++
                if (
                    ball.x > brick.x &&
                    ball.x < brick.x + brickWidth &&
                    ball.y > brick.y &&
                    ball.y < brick.y + brickHeight
                ) {
                    ball.dy = -ball.dy
                    brick.status = 0
                    break
                }
            }
        }

        if (remainingBricks === 0) {
            setWon(true)
        }
    }

    const movePaddle = (paddleWidth, deltaTime) => {
        let paddleX = paddleXRef.current
        if (rightPressedRef.current && paddleX < size.width - paddleWidth) {
            paddleX += PADDLE_SPEED * deltaTime
        } else if (leftPressedRef.current && paddleX > 0) {
            paddleX -= PADDLE_SPEED * deltaTime
        }
        paddleXRef.current = paddleX
    }

    const resetGame = () => {
        setLost(false)
        setWon(false)
        setStarted(true)
        const paddleWidth = size.width / 6
        paddleXRef.current = (size.width - paddleWidth) / 2
        ballRef.current = {
            x: size.width / 2,
            y: size.height - 30,
            dx: 1,
            dy: -1,
        }
        bricksRef.current = createBricks(
            size.width,
            (size.width - BRICK_PADDING * (BRICK_COLUMN_COUNT + 1)) /
                BRICK_COLUMN_COUNT,
            20
        )
    }

    const startGame = () => {
        setStarted(true)
    }

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: bgColor,
                position: "relative",
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ display: "block", width: "100%", height: "100%" }}
                tabIndex={0}
            />
        </div>
    )
}

BricksGame.displayName = "Bricks Game"

BricksGame.defaultProps = {
    bgColor: "#f3f3f3",
    paddleColor: "#0095DD",
    brickColor: "#ff5733",
    startTextColor: "#ffffff",
    startTextFontFamily: "Arial",
    startTextFontSize: 24,
    startText: "Press ENTER to start the game",
    lostTextColor: "#ff0000",
    lostTextFontFamily: "Arial",
    lostTextFontSize: 48,
    lostText: "WASTED!",
    winTextColor: "#00ff00",
    winTextFontFamily: "Arial",
    winTextFontSize: 48,
    winText: "You're the BOSS",
    restartTextColor: "#ffffff",
    restartTextFontFamily: "Arial",
    restartTextFontSize: 20,
    restartText: "Press ENTER to play again",
}

addPropertyControls(BricksGame, {
    bgColor: { type: ControlType.Color, title: "Background Color" },
    paddleColor: { type: ControlType.Color, title: "Paddle Color" },
    brickColor: { type: ControlType.Color, title: "Brick Color" },
    startTextColor: { type: ControlType.Color, title: "Start Text Color" },
    startTextFontFamily: {
        type: ControlType.String,
        title: "Start Font Family",
    },
    startTextFontSize: {
        type: ControlType.Number,
        title: "Start Font Size",
        min: 10,
        max: 100,
    },
    startText: { type: ControlType.String, title: "Start Text" },
    lostTextColor: { type: ControlType.Color, title: "Lost Text Color" },
    lostTextFontFamily: { type: ControlType.String, title: "Lost Font Family" },
    lostTextFontSize: {
        type: ControlType.Number,
        title: "Lost Font Size",
        min: 10,
        max: 100,
    },
    lostText: { type: ControlType.String, title: "Lost Text" },
    winTextColor: { type: ControlType.Color, title: "Win Text Color" },
    winTextFontFamily: { type: ControlType.String, title: "Win Font Family" },
    winTextFontSize: {
        type: ControlType.Number,
        title: "Win Font Size",
        min: 10,
        max: 100,
    },
    winText: { type: ControlType.String, title: "Win Text" },
    restartTextColor: { type: ControlType.Color, title: "Restart Text Color" },
    restartTextFontFamily: {
        type: ControlType.String,
        title: "Restart Font Family",
    },
    restartTextFontSize: {
        type: ControlType.Number,
        title: "Restart Font Size",
        min: 10,
        max: 100,
    },
    restartText: { type: ControlType.String, title: "Restart Text" },
})
