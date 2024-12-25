// App.tsx

import React, { useEffect, useState } from "react"
import axios from "axios"
import supabase from "./services/supabase/supabaseClient.ts"
import Waveform from "./components/Waveform.tsx"
import { motion } from "motion/react"
import { getSharedAudioContext } from "./sharedAudioContext"
import Visualiser from "./components/Visualiser.tsx"

// ... your schemas, etc.

const App: React.FC = () => {
  const [audioContext] = useState<AudioContext>(() => getSharedAudioContext())
  //                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // This ensures we only call getSharedAudioContext() once on mount.

  const [filterFrequency, setFilterFrequency] = useState<number>(10000)
  const [responseMessage, setResponseMessage] = useState<string>("")
  const [oldStartTime, setOldStartTime] = useState<number | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const [isFrozen, setIsFrozen] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(
    null,
  )
  const [filterNode, setFilterNode] = useState<BiquadFilterNode | null>(null)
  const [gainNode, setGainNode] = useState<GainNode | null>(null)

  useEffect(() => {
    const fetchAudio = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("audio-files")
          .download("test-audio.mp3")

        if (error) throw error

        const audioBlob = new Blob([data], { type: "audio/mpeg" })
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioUrl(audioUrl)

        // Instead of creating a new AudioContext here, just reuse our shared context.
        const filter = audioContext.createBiquadFilter()
        const gain = audioContext.createGain()

        filter.type = "lowpass"
        filter.frequency.value = filterFrequency
        gain.gain.value = 1

        setFilterNode(filter)
        setGainNode(gain)
      } catch (err) {
        console.error("Error fetching audio file:", err)
      }
    }

    fetchAudio()

    // Cleanup: In a single-context approach, we usually do NOT close() the context on unmount,
    // because we might want to keep reusing it for the entire session.
    // If you do close it, you'll recreate it next time, which can reintroduce clicks.
    //
    // return () => {
    //   audioContext.close()
    // }
  }, [audioContext])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const fileName = "test-audio.mp3"

    try {
      // Validate data if needed ...

      const response = await axios.post<{ message: string; url: string }>(
        "/process",
        { fileName, filterFrequency },
        { headers: { "Content-Type": "application/json" } },
      )

      if (response.status !== 200) {
        setResponseMessage(
          response.data.message || "File processed successfully!",
        )
      }

      setAudioUrl(response.data.url || null)

      if (!response.data.url || !audioContext) return

      // 1) Fetch & Decode the new audio FIRST (before messing with the old audio)
      const responseAudioData = await fetch(response.data.url).then((res) =>
        res.arrayBuffer(),
      )
      const newBuffer = await audioContext.decodeAudioData(responseAudioData)

      // 2) Create a new source/gain node, but don't fade in yet
      const newSource = audioContext.createBufferSource()
      newSource.buffer = newBuffer
      newSource.loop = true

      const newGainNode = audioContext.createGain()
      newGainNode.gain.setValueAtTime(0, audioContext.currentTime) // start at 0 volume

      // IMPORTANT CHANGE:
      // Instead of going "newSource -> filterNode -> newGainNode", we skip the filter:
      newSource.connect(newGainNode)
      newGainNode.connect(audioContext.destination)

      // The new audio is ready to play, but at 0 volume

      // 3) Crossfade: fade out old, fade in new
      if (sourceNode && gainNode) {
        gainNode.gain.setValueAtTime(
          gainNode.gain.value,
          audioContext.currentTime,
        )
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1)
      }

      // 4) Start the new source immediately (it will be inaudible at first)
      const timeSinceStart = audioContext.currentTime - oldStartTime

      // If the old track is looping, mod by buffer duration:
      const oldBufferDuration = sourceNode?.buffer?.duration || 0
      const playbackOffset = timeSinceStart % oldBufferDuration
      newSource.start(audioContext.currentTime, playbackOffset)

      // Fade in the new audio from 0 to 1 in 1 second
      newGainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 1)

      setIsFrozen(true)
      // 5) After 1 second, fully stop the old source (if it exists)
      setTimeout(() => {
        if (sourceNode) {
          sourceNode.stop()
          setSourceNode(null)
        }
      }, 1000)

      // 6) Update React state to reflect the new audio is playing
      setSourceNode(newSource)
      setGainNode(newGainNode)
      setIsPlaying(true)
    } catch (err) {
      console.error("Error processing request:", err)
      setResponseMessage("Failed to process the file.")
    }
  }

  const handlePlay = async () => {
    if (!audioUrl || !audioContext || !filterNode || !gainNode) return

    try {
      const audioData = await fetch(audioUrl).then((r) => r.arrayBuffer())
      const audioBuffer = await audioContext.decodeAudioData(audioData)

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.loop = true

      // 1. Create a new analyser node
      const newAnalyser = audioContext.createAnalyser()
      newAnalyser.fftSize = 2048 // or 4096 for more detail, depends on your preference

      // 2. Connect your nodes, inserting the analyser
      source.connect(filterNode)
      filterNode.connect(newAnalyser) // pass the signal through the analyser
      newAnalyser.connect(gainNode) // then to the gain node
      gainNode.connect(audioContext.destination)

      // 3. Start playback
      setOldStartTime(audioContext.currentTime)
      source.start()

      // 4. Update state
      setSourceNode(source)
      setAnalyser(newAnalyser) // store the analyser for the visualizer
      setIsPlaying(true)
    } catch (err) {
      console.error("Error playing audio:", err)
    }
  }

  const handlePause = () => {
    if (sourceNode) {
      sourceNode.stop()
      setIsPlaying(false)
      setSourceNode(null)
    }
  }

  const handleFrequencyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const frequency = Number(event.target.value)
    setFilterFrequency(frequency)
    if (filterNode) {
      filterNode.frequency.value = frequency
    }
  }

  return (
    <div className="flex w-screen justify-center">
      <div className="relative min-w-[500px] overflow-hidden rounded bg-neutral-800">
        {isFrozen && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute h-full w-full bg-sky-400/20"
          />
        )}

        <div className="flex w-full justify-between gap-[8px] p-[8px]">
          test-audio.mp3
          <div className="flex gap-[8px]">
            <button
              onClick={handlePlay}
              disabled={!audioUrl}
              className="bg flex h-[20px] w-[20px] rounded-full border border-neutral-950 bg-green-600"
            />
            <button
              onClick={handlePause}
              disabled={!audioUrl}
              className="bg flex h-[20px] w-[20px] border border-neutral-950 bg-white"
            />
          </div>
        </div>

        {audioUrl && <Waveform isPlaying={isPlaying} audioUrl={audioUrl} />}

        <div className="flex min-w-[500px] flex-col gap-[8px] overflow-hidden rounded bg-neutral-700 p-[8px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <div className="bg flex h-[20px] w-[20px] rounded-full border border-neutral-950 bg-amber-400" />
              <div className="font-semibold tracking-tighter">
                Lowpass Filter
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex gap-[8px]">
            <Visualiser
              frequency={filterFrequency}
              onFrequencyChange={(newFreq: number) => {
                // We want to replicate the effect of handleFrequencyChange
                // except `newFreq` is just a number, not an event
                setFilterFrequency(newFreq)
                if (filterNode) {
                  filterNode.frequency.value = newFreq
                }
              }}
              analyser={analyser}
            />

            <form
              onSubmit={handleSubmit}
              className={"flex flex-grow rounded bg-neutral-800"}
            >
              <div className="flex w-full flex-col items-center justify-center">
                <label>Freq</label>
                <input
                  type="number"
                  value={filterFrequency}
                  className="bg-transparent"
                  onChange={handleFrequencyChange}
                  min="20"
                  max="20000"
                />
                <button type="submit">Freeze</button>
              </div>
            </form>
          </div>

          {responseMessage && <p>{responseMessage}</p>}
        </div>
      </div>
    </div>
  )
}

export default App
