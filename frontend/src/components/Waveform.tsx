import React, { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"

interface WaveformProps {
  audioUrl: string
  isPlaying: boolean // Whether the audio is currently playing
}

const Waveform: React.FC<WaveformProps> = ({ audioUrl, isPlaying }) => {
  const [waveformPath, setWaveformPath] = useState("")
  const [filledPath, setFilledPath] = useState("")
  const [duration, setDuration] = useState(0)
  const [playheadX, setPlayheadX] = useState(0)
  const animationRef = useRef<number | null>(null)
  const playheadStartTime = useRef<number | null>(null) // Tracks the start time of playhead movement

  const svgWidth = 600
  const svgHeight = 200

  useEffect(() => {
    const generateWaveform = async () => {
      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()

      const audioCtx = new window.AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

      const rawData = audioBuffer.getChannelData(0) // Use first channel
      const samples = 500 // Number of samples
      const blockSize = Math.floor(rawData.length / samples)
      const filteredData = []

      for (let i = 0; i < samples; i++) {
        const blockStart = blockSize * i
        let sum = 0

        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[blockStart + j])
        }

        const averageAmplitude = sum / blockSize
        filteredData.push(averageAmplitude < 0.01 ? 0 : averageAmplitude)
      }

      // Set the duration from the decoded audio buffer
      setDuration(audioBuffer.duration)

      const midY = svgHeight / 2
      const xStep = svgWidth / samples
      const maxAmplitude = Math.max(...filteredData)

      let topPath = `M 0 ${midY}`
      let filledArea = `M 0 ${midY}`

      filteredData.forEach((value, index) => {
        const x = index * xStep
        const y =
          value === 0 ? midY : midY - (value / maxAmplitude) * (svgHeight / 2)
        topPath += ` L ${x} ${y}`
        filledArea += ` L ${x} ${y}`
      })

      filteredData.reverse().forEach((value, index) => {
        const x = (samples - index - 1) * xStep
        const y =
          value === 0 ? midY : midY + (value / maxAmplitude) * (svgHeight / 2)
        filledArea += ` L ${x} ${y}`
      })

      filledArea += " Z"

      setWaveformPath(topPath)
      setFilledPath(filledArea)
    }

    generateWaveform()
  }, [audioUrl])

  useEffect(() => {
    if (isPlaying) {
      playheadStartTime.current = performance.now() // Start tracking playhead position

      const movePlayhead = () => {
        if (!playheadStartTime.current || duration === 0) return

        const elapsed = (performance.now() - playheadStartTime.current) / 1000 // Elapsed time in seconds
        const newX = (elapsed / duration) * svgWidth // Calculate new X position

        if (newX >= svgWidth) {
          setPlayheadX(0) // Reset playhead if it reaches the end
          playheadStartTime.current = performance.now() // Restart timer
        } else {
          setPlayheadX(newX)
        }

        animationRef.current = requestAnimationFrame(movePlayhead)
      }

      animationRef.current = requestAnimationFrame(movePlayhead)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, duration])

  return (
    <svg
      id="waveform"
      width={svgWidth}
      height={svgHeight}
      className="mx-[5px] my-[16px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Filled area */}
      <motion.path
        d={filledPath}
        fill="black"
        animate={{ d: filledPath }} // Animates when `filledPath` changes
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      {/* Waveform outline */}
      <motion.path
        d={waveformPath}
        className={"fill-none stroke-black"}
        animate={{ d: waveformPath }} // Animates when `waveformPath` changes
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
      {/* Playhead */}
      <line
        x1={playheadX}
        y1="0"
        x2={playheadX}
        y2={svgHeight}
        className={"stroke-white rounded stroke-[0.5px]"}
      />
    </svg>
  )
}

export default Waveform
