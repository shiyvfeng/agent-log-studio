import path from 'node:path';
import {existsSync} from 'node:fs';
import {DEFAULT_PORT} from '../src/config.js';
export const baseURL=process.env.AGENT_LOG_STUDIO_TEST_URL||`http://127.0.0.1:${process.env.PORT||DEFAULT_PORT}`;
export const executablePath=[process.env.CHROME_PATH,
 '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
 process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'),
 process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),
].filter(Boolean).find(file=>existsSync(file));
if(!executablePath)throw Error('Install Google Chrome or set CHROME_PATH before running browser checks.');
