import fs from "fs";
import path from "path";
import {logInfo} from "./chalk.js";

export function cleanUpTemporaryFiles(inputFilePath: string, processedFilePath: string) {
  fs.unlinkSync(inputFilePath);
  fs.unlinkSync(processedFilePath);
  logInfo("Cleaning up temporary files")
}

export  async function saveFileLocally(fileName: string, fileData: Blob) {
  logInfo('Creating temporary files')
  const inputFilePath = path.join('uploads', fileName);
  fs.writeFileSync(inputFilePath, Buffer.from(await fileData.arrayBuffer()));
  return inputFilePath;
}

export function generateProcessedFileInfo(fileName: string | undefined) {
  const processedFileName = `processed-${Date.now()}-${fileName}`;
  const processedFilePath = path.join('processed', processedFileName);
  return {processedFileName, processedFilePath};
}
