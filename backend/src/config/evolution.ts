export const evolutionConfig = {
  baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || '',
};

export async function evolutionRequest<T>(
  instanceId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = evolutionConfig;

  const response = await fetch(`${config.baseUrl}/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.apiKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Evolution API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<T>;
}
