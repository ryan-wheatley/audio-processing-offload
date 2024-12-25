import supabase from "./supabaseClient.js";

export async function generatePublicUrl(processedFileName: string){
  const { data } = supabase.storage.from('audio-files').getPublicUrl(processedFileName);

  return data.publicUrl
}