import { GoogleGenAI } from "@google/genai";

let cachedProjectId: string | null = null;

export async function getProjectId(): Promise<string> {
  if (cachedProjectId) return cachedProjectId;

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    cachedProjectId = process.env.GOOGLE_CLOUD_PROJECT;
    return cachedProjectId;
  }

  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/project/project-id",
      { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(2000) },
    );
    if (res.ok) {
      cachedProjectId = await res.text();
      return cachedProjectId;
    }
  } catch {}

  throw new Error("GOOGLE_CLOUD_PROJECT is not set and metadata server is unreachable");
}

export async function getAiClient(): Promise<GoogleGenAI> {
  const projectId = await getProjectId();
  return new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: "asia-northeast1",
  });
}

export const GEMINI_MODEL = "gemini-2.5-flash";
