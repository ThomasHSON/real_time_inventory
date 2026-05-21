interface Config {
  domain: string;
  homepage: string;
}

let config: Config | null = null;

export const loadConfig = async (): Promise<Config> => {
  if (config) return config;
  
  try {
    const response = await fetch('/config.txt');
    if (!response.ok) {
      throw new Error('Failed to load configuration');
    }
    config = await response.json();
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    throw error;
  }
};

export const getApiUrl = (path: string): string => {
  if (!config) {
    throw new Error('Configuration not loaded');
  }
  return `${config.domain}${path}`;
};

export const getConfig = (): Config | null => {
  return config;
};