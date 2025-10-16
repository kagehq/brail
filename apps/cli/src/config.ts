import { readFile, writeFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export interface Config {
  apiUrl: string;
  token: string;
}

const CONFIG_DIR = join(homedir(), '.br');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export async function loadConfig(): Promise<Config | null> {
  try {
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(`Failed to save config: ${error}`);
  }
}

export async function requireConfig(): Promise<Config> {
  const config = await loadConfig();
  
  if (!config) {
    throw new Error(
      'Not logged in. Run "br login" first to authenticate.',
    );
  }
  
  return config;
}

