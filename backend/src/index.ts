import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import {downloadFile} from "./services/supabase/downloadFile.js";
import {uploadFile} from "./services/supabase/uploadFile.js";
import {generatePublicUrl} from "./services/supabase/generatePublicUrl.js";
import {cleanUpTemporaryFiles, generateProcessedFileInfo, saveFileLocally} from "./utils/fs.js";
import {applyLowPassFilter} from "./utils/ffmpeg.js";

import {z} from "zod";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const processSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  filterFrequency: z.number().min(20, 'Frequency must be at least 20').max(20000, 'Frequency cannot exceed 20000'),
});

app.post('/process', async (req: Request, res: Response) => {
  const { fileName, filterFrequency } = processSchema.parse(req.body);

  try {
    const fileData = await downloadFile(fileName)

    const inputFilePath = await saveFileLocally(fileName, fileData);

    const {processedFileName, processedFilePath} = generateProcessedFileInfo(fileName);

    const onComplete = async () => {
      await uploadFile(processedFileName, fs.readFileSync(processedFilePath))
      const publicUrl = await generatePublicUrl(processedFileName)

      cleanUpTemporaryFiles(inputFilePath, processedFilePath);

      return res.status(200).json({
        message: 'File processed and uploaded successfully',
        url: publicUrl,
      });
    }

    applyLowPassFilter(inputFilePath, filterFrequency, processedFilePath, onComplete);

      } catch (error: any) {
  res.status(500).json({ error: error.message});
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
