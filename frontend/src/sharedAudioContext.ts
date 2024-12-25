// sharedAudioContext.ts

let sharedAudioContext: AudioContext | null = null

/** Returns a single shared AudioContext for the entire app */
export function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}
