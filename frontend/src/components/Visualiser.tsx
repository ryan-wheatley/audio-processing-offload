import React, { useCallback, useEffect, useRef, useState } from "react"

interface LogVisualizerProps {
  analyser: AnalyserNode
  frequency: number
  onFrequencyChange: (newFrequency: number) => void
}

const CANVAS_WIDTH = 500
const CANVAS_HEIGHT = 200

const LogVisualizer: React.FC<LogVisualizerProps> = ({
  analyser,
  frequency,
  onFrequencyChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pathData, setPathData] = useState("")

  // For dragging:
  const [isDragging, setIsDragging] = useState(false)

  // We'll define min/max freq for the log scale:
  const minFreq = 20
  const maxFreq = 20000

  // ----------------------------------------------------------------------------
  //  HELPER FUNCTIONS
  // ----------------------------------------------------------------------------
  const freqToX = useCallback(
    (freq: number) => {
      // clamp freq just in case
      const f = Math.max(minFreq, Math.min(freq, maxFreq))
      const normalized =
        (Math.log10(f) - Math.log10(minFreq)) /
        (Math.log10(maxFreq) - Math.log10(minFreq))
      return normalized * CANVAS_WIDTH
    },
    [minFreq, maxFreq],
  )

  const xToFreq = useCallback(
    (x: number) => {
      const normalizedX = x / CANVAS_WIDTH
      const freqVal = Math.pow(
        10,
        Math.log10(minFreq) +
          normalizedX * (Math.log10(maxFreq) - Math.log10(minFreq)),
      )
      return freqVal
    },
    [minFreq, maxFreq],
  )

  // ----------------------------------------------------------------------------
  //  1) DRAW FILLED EQ LINE ON CANVAS
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!analyser) return

    analyser.fftSize = 4096
    analyser.smoothingTimeConstant = 0.8
    analyser.minDecibels = -90
    analyser.maxDecibels = -10

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const fftSize = analyser.fftSize
    const sampleRate = analyser.context.sampleRate
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    let animationFrameId: number

    const renderFrame = () => {
      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.beginPath()

      let firstValid = true

      for (let i = 1; i < bufferLength; i++) {
        const realFreq = (i * sampleRate) / fftSize
        if (realFreq < minFreq || realFreq > maxFreq) continue

        // freq -> x
        const x = freqToX(realFreq)

        // amplitude in [0..255], invert so 255 is top
        const amplitude = dataArray[i]
        const y = (1 - amplitude / 255) * CANVAS_HEIGHT

        if (firstValid) {
          ctx.moveTo(x, y)
          firstValid = false
        } else {
          ctx.lineTo(x, y)
        }
      }

      // close shape to bottom
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.lineTo(0, CANVAS_HEIGHT)
      ctx.closePath()

      // fill
      ctx.fillStyle = "rgba(150, 150, 150, 0.25)"
      ctx.fill()

      animationFrameId = requestAnimationFrame(renderFrame)
    }

    renderFrame()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [analyser, freqToX])

  // ----------------------------------------------------------------------------
  //  2) DRAW SIMPLE TWO-PART LOWPASS CURVE (SVG)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    // freq -> x
    const xCut = freqToX(frequency)

    const midY = CANVAS_HEIGHT / 2
    const ctrlX = xCut + 50
    const curveEndX = xCut + 100

    const newPath = [
      `M0,${midY}`,
      `L${xCut},${midY}`,
      `Q${ctrlX},${midY} ${curveEndX},${CANVAS_HEIGHT}`,
    ].join(" ")

    setPathData(newPath)
  }, [frequency, freqToX])

  // ----------------------------------------------------------------------------
  //  3) DRAGGABLE CIRCLE
  // ----------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      // figure out how far left the container is
      // so we can get an x in [0..CANVAS_WIDTH]
      const bounding = (
        canvasRef.current?.parentElement ?? document.body
      ).getBoundingClientRect()

      const offsetX = e.clientX - bounding.left
      // clamp to [0..CANVAS_WIDTH]
      const clampedX = Math.max(0, Math.min(offsetX, CANVAS_WIDTH))
      // convert x -> freq
      const newFreq = xToFreq(clampedX)
      onFrequencyChange(Math.round(newFreq))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, xToFreq, onFrequencyChange])

  // ----------------------------------------------------------------------------
  //  4) RENDER
  // ----------------------------------------------------------------------------
  // The circle's center x is freq -> x
  const circleX = freqToX(frequency)
  // We'll keep it halfway vertically for simplicity
  const circleY = CANVAS_HEIGHT / 2
  const circleRadius = 5

  return (
    <div
      className="relative"
      style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    >
      {/* Canvas with the EQ line */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="absolute left-0 top-0"
        style={{ backgroundColor: "#222" }}
      />

      {/* SVG overlay for the 2-part low-pass curve */}
      <svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pointer-events-none absolute left-0 top-0"
      >
        <path d={pathData} className="stroke-white stroke-[1px]" fill="none" />
      </svg>

      {/* Draggable Circle in the DOM */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute" ,
          left: `${circleX - circleRadius}px`,
          top: `${circleY - circleRadius}px`,
          width: `${circleRadius * 2}px`,
          height: `${circleRadius * 2}px`,
          borderRadius: "50%",
          userSelect: "none",
        }}
        className={"bg-blue-400"}
      />
    </div>
  )
}

export default LogVisualizer
