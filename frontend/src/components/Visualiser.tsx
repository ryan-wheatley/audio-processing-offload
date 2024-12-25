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

  const [isDragging, setIsDragging] = useState(false)

  const minFreq = 20
  const maxFreq = 20000

  const freqToX = useCallback(
    (freq: number) => {
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

        const x = freqToX(realFreq)
        const amplitude = dataArray[i]
        const y = (1 - amplitude / 255) * CANVAS_HEIGHT

        if (firstValid) {
          ctx.moveTo(x, y)
          firstValid = false
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.lineTo(0, CANVAS_HEIGHT)
      ctx.closePath()

      ctx.fillStyle = "rgba(150, 150, 150, 0.25)"
      ctx.fill()

      animationFrameId = requestAnimationFrame(renderFrame)
    }

    renderFrame()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [analyser, freqToX])

  useEffect(() => {
    const xCut = freqToX(frequency)

    const midY = CANVAS_HEIGHT / 2
    const ctrlX = xCut + 50
    const curveEndX = xCut + 100

    const newPath = [
      `M 20,${midY}`,
      `L${xCut},${midY}`,
      `Q${ctrlX},${midY} ${curveEndX},${CANVAS_HEIGHT}`,
    ].join(" ")

    setPathData(newPath)
  }, [frequency, freqToX])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const bounding = (
        canvasRef.current?.parentElement ?? document.body
      ).getBoundingClientRect()

      const offsetX = e.clientX - bounding.left
      const clampedX = Math.max(0, Math.min(offsetX, CANVAS_WIDTH))
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

  const circleX = freqToX(frequency)
  const circleY = CANVAS_HEIGHT / 2
  const circleRadius = 6

  // Render frequency markers
  const renderFrequencyMarkers = () => {
    const markerFrequencies = [ 100,  1000, 10000]
    return markerFrequencies.map((freq) => {
      const x = freqToX(freq)
      return (
        <React.Fragment key={freq}>
          <line
            x1={x}
            y1={0}
            x2={x}
            y2={CANVAS_HEIGHT -15}
            className={'stroke-neutral-500 stroke-[0.3px]'}
          />
          <text
            x={x}
            y={CANVAS_HEIGHT - 5}
            className={'fill-neutral-500'}
            fontSize="10"
            textAnchor="middle"
          >
            {freq}
          </text>
        </React.Fragment>
      )
    })
  }

  // Render amplitude lines with 0 dB in the center
  const renderAmplitudeLines = () => {
    // Setting the dB levels to be centered: -6 dB, 0 dB, and +6 dB
    const amplitudes = [6, 0, -6]  // -6, 0, and +6 dB levels
    return amplitudes.map((amplitude) => {
      const y = CANVAS_HEIGHT / 2 + (amplitude / 2 * CANVAS_HEIGHT) / 12  // Convert dB levels to canvas Y positions
      return (
        <React.Fragment key={amplitude}>
          <line
            x1={20}
            y1={y}
            x2={CANVAS_WIDTH}
            y2={y}
             className={'stroke-neutral-500 stroke-[0.2px]'}
          />
          <text
            x={5}
            y={y + 3}
            fontSize="10"
            className={'fill-neutral-500'}
            textAnchor="start"
          >
            {-1*amplitude}
          </text>
        </React.Fragment>
      )
    })
  }

  return (
    <div
      className="relative rounded overflow-hidden"
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
        <path d={pathData} className="stroke-blue-400 stroke-[2px]" fill="none" />
        {renderFrequencyMarkers()}
        {renderAmplitudeLines()} {/* Render amplitude lines */}
      </svg>

      {/* Draggable Circle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          left: `${circleX - circleRadius}px`,
          top: `${circleY - circleRadius}px`,
          width: `${circleRadius * 2}px`,
          height: `${circleRadius * 2}px`,
          borderRadius: "50%",
          userSelect: "none",
        }}
        className={"bg-amber-400"}
      />
    </div>
  )
}

export default LogVisualizer
