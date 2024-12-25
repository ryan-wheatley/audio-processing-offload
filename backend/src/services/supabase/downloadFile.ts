import supabase from "./supabaseClient.js";
import {logInfo, logSuccess} from "../../utils/chalk.js";

export async function downloadFile(fileName: string) {
  logInfo("Downloading source file from bucket")
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('audio-files')
    .download(fileName);

  if (downloadError || !fileData) {
    throw new Error(`Error downloading file from Supabase: ${downloadError?.message}`);
  }

  logSuccess("Successfully downloaded source file")

  return fileData
}