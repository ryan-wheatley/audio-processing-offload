import supabase from "./supabaseClient.js";

export async function uploadFile(processedFileName:string, fileBuffer: Buffer<ArrayBufferLike>) {
  if (!processedFileName.startsWith('processed-')) throw new Error(`Incorrect name format for file: ${processedFileName}` )

  const { error: uploadError, data } = await supabase.storage
    .from('audio-files')
    .upload(processedFileName, fileBuffer, {
      contentType: 'audio/mpeg',
    });

  if (uploadError || !data) {
    throw new Error(`Error uploading file from Supabase: ${uploadError.message}`);
  }

  return data
}