import {spawn} from "child_process";
import {logInfo, logSuccess} from "./chalk.js";

export  function
applyLowPassFilter(inputFilePath: string, filterFrequency: number | undefined, processedFilePath: string, onComplete: () => void) {
  logInfo("Rendering effect with ffmpeg")
  const ffmpeg = spawn('ffmpeg', [
    '-i', inputFilePath,
    '-af', `lowpass=f=${filterFrequency}`,
    processedFilePath,
  ]);

  ffmpeg.on('close', async () => {
    logSuccess(`New audio file rendered with lowpass at ${filterFrequency}Hz`)
    onComplete()
  });


  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
    throw new Error('')
  });

}
