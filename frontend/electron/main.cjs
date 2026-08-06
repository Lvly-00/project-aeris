const { app, BrowserWindow, Tray, Menu, dialog, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let tray = null;
let djangoProcess = null;
let aiProcess = null;
let aiRestartCount = 0;
const AI_MAX_RESTARTS = 3;
const AI_RESTART_DELAY_MS = 5000;

const isDev = !app.isPackaged;
const BACKEND_PORT = 8000;
const AI_PORT = 8005;

function getBackendDir() {
  if (isDev) {
    return path.resolve(__dirname, '..', '..', 'backend');
  }
  return path.join(process.resourcesPath, 'backend');
}

function getFrontendDir() {
  if (isDev) {
    return path.resolve(__dirname, '..', 'dist');
  }
  return path.join(process.resourcesPath, 'frontend');
}

function getDbDir() {
  try {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return dbDir;
  } catch (err) {
    writeLog(`Failed to create db dir: ${err.message}`);
    return getBackendDir();
  }
}

function getBundledVenvPython() {
  if (process.platform === 'win32') {
    return path.join(getBackendDir(), 'venv', 'Scripts', 'python.exe');
  }
  return path.join(getBackendDir(), 'venv', 'bin', 'python');
}

function getPythonCmd() {
  const venvPython = getBundledVenvPython();
  if (fs.existsSync(venvPython)) return venvPython;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function getPortablePythonPath() {
  if (process.platform === 'win32') {
    const dir = isDev
      ? path.resolve(__dirname, '..', '..', 'backend', 'portable-python')
      : path.join(process.resourcesPath, 'portable-python');
    const exe = path.join(dir, 'python.exe');
    return fs.existsSync(exe) ? exe : null;
  }
  return null; // Linux/macOS rely on system Python
}

function findSystemPython() {
  const candidates = [];

  // Check bundled portable Python first
  const portableExe = getPortablePythonPath();
  if (portableExe) candidates.push(portableExe);

  if (process.platform === 'win32') {
    // Common Python install locations on Windows
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    for (const dir of [`${localAppData}\\Programs\\Python`, programFiles, programFilesX86]) {
      for (const ver of ['Python313', 'Python312', 'Python311', 'Python310', 'Python39', 'Python38']) {
        const exe = path.join(dir, ver, 'python.exe');
        if (fs.existsSync(exe)) candidates.push(exe);
      }
    }
    // Also check PATH (excluding WindowsApps stub)
    const pathDirs = (process.env.PATH || '').split(';');
    for (const dir of pathDirs) {
      const trimmed = dir.trim();
      if (trimmed.toLowerCase().includes('windowsapps')) continue;
      const exe = path.join(trimmed, 'python.exe');
      if (fs.existsSync(exe) && !candidates.includes(exe)) candidates.push(exe);
    }
    // Try py launcher to find real Python path
    try {
      const pyScript = `
import sys, os
exe = os.path.realpath(sys.executable)
print(exe)
      `.trim();
      const result = runPythonScriptWithExeSync('py', ['-3.10', '-c', pyScript])
        || runPythonScriptWithExeSync('py', ['-3.11', '-c', pyScript])
        || runPythonScriptWithExeSync('py', ['-3.12', '-c', pyScript])
        || runPythonScriptWithExeSync('py', ['-c', pyScript]);
      if (result && !candidates.includes(result)) candidates.unshift(result);
    } catch (_) {}
    // Try where python
    try {
      const whereResult = require('child_process').execSync('where python 2>nul', { encoding: 'utf8', timeout: 3000 });
      for (const line of whereResult.split('\n')) {
        const exe = line.trim();
        if (exe && !exe.toLowerCase().includes('windowsapps') && fs.existsSync(exe) && !candidates.includes(exe)) {
          candidates.unshift(exe);
        }
      }
    } catch (_) {}
  } else {
    // On macOS/Linux, check common locations
    const linuxDirs = ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin', '/home/linuxbrew/.linuxbrew/bin'];
    for (const dir of linuxDirs) {
      for (const ver of ['python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3']) {
        const exe = path.join(dir, ver);
        if (fs.existsSync(exe) && !candidates.includes(exe)) candidates.push(exe);
      }
    }
    // Try `which python3` for PATH-installed Pythons
    try {
      const whichResult = require('child_process').execSync('which python3 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
      const exe = whichResult.trim();
      if (exe && fs.existsSync(exe) && !candidates.includes(exe)) candidates.unshift(exe);
    } catch (_) {}
  }
  return candidates;
}

function runPythonScriptWithExeSync(pythonExe, args) {
  try {
    const result = require('child_process').execFileSync(pythonExe, args, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (_) {
    return null;
  }
}

function getPythonVersion(exe) {
  try {
    const out = require('child_process').execFileSync(exe, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'], { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    return out.trim();
  } catch (_) {
    return null;
  }
}

async function repairBundledVenv(env) {
  const venvDir = path.join(getBackendDir(), 'venv');
  const pyvenvCfg = path.join(venvDir, 'pyvenv.cfg');
  if (!fs.existsSync(pyvenvCfg)) return false;

  const content = fs.readFileSync(pyvenvCfg, 'utf-8');
  const originalHome = content.match(/^home\s*=\s*(.+)$/m);
  if (!originalHome) return false;
  const origPath = originalHome[1].trim();

  // Get the venv's own Python version from its executable
  const venvPython = getPythonCmd();
  const venvVersion = getPythonVersion(venvPython);

  // Try original path first (maybe Python is still there)
  let foundPython = null;
  const origExeCandidates = process.platform === 'win32'
    ? [path.join(origPath, 'python.exe')]
    : [path.join(origPath, 'python3'), path.join(origPath, 'python'), origPath];
  for (const exe of origExeCandidates) {
    if (fs.existsSync(exe)) {
      try {
        await runPythonScriptWithExe(exe, ['-c', 'print("ok")'], env);
        foundPython = exe;
        break;
      } catch (_) {}
    }
  }

  // Original not found — search for system Python
  if (!foundPython) {
    for (const candidate of findSystemPython()) {
      try {
        await runPythonScriptWithExe(candidate, ['-c', 'print("ok")'], env);
        // Check version match — skip if different (compiled .pyd files would crash)
        if (venvVersion) {
          const candidateVersion = getPythonVersion(candidate);
          if (candidateVersion && candidateVersion !== venvVersion) {
            writeLog(`Skipping ${candidate} (v${candidateVersion}) — bundled venv is v${venvVersion}, would cause .pyd incompatibility`);
            continue;
          }
        }
        foundPython = candidate;
        break;
      } catch (_) {}
    }
  }

  if (!foundPython) return false;

  // Rewrite pyvenv.cfg to point to the found Python
  const newHome = path.dirname(foundPython);
  const newContent = content.replace(/^home\s*=.*$/m, `home = ${newHome}`);
  fs.writeFileSync(pyvenvCfg, newContent, 'utf-8');
  writeLog(`Repaired pyvenv.cfg: home -> ${newHome}`);

  // Verify the repair — test with a compiled extension import
  try {
    await runPythonScript(['-c', 'import sqlite3; import django; print("ok")'], env);
    writeLog(`Repaired venv works (with compiled extensions)`);
    return true;
  } catch (err) {
    writeLog(`Repair still fails when importing compiled extensions: ${err.message.slice(0, 200)}`);
    // Restore original pyvenv.cfg so next attempt is clean
    fs.writeFileSync(pyvenvCfg, content, 'utf-8');
    return false;
  }
}

async function ensurePythonWorks(env) {
  // Try bundled venv first
  writeLog('Checking bundled venv...');
  const venvPython = getPythonCmd();
  try {
    const out = await runPythonScript(['-c', 'import sys; print(f"Python {sys.version_info.major}.{sys.version_info.minor}")'], env);
    writeLog(`Bundled venv works: ${out.trim()}`);
    return venvPython;
  } catch (err) {
    writeLog(`Bundled venv failed: ${err.message.slice(0, 200)}`);
  }

  // Try to repair the bundled venv by rewriting pyvenv.cfg
  writeLog('Attempting to repair bundled venv...');
  if (await repairBundledVenv(env)) {
    return getPythonCmd();
  }

  // Repair failed — look for system Python
  writeLog('Looking for system Python...');
  for (const candidate of findSystemPython()) {
    try {
      const out = await runPythonScriptWithExe(candidate, ['-c', `
import sys, os
ver = f"{sys.version_info.major}.{sys.version_info.minor}"
try:
    import venv; print(f"OK:{ver}")
except ImportError:
    print(f"NOVENV:{ver}")
      `.trim()], env);
      const parts = out.trim().split(':');
      if (parts[0] === 'OK') {
        writeLog(`Found system Python ${candidate} (${parts[1]})`);
        return { exe: candidate, version: parts[1] };
      }
      writeLog(`System Python ${candidate} ${parts[0]}`);
    } catch (_) {
      writeLog(`System Python ${candidate} failed`);
    }
  }

  return null;
}

async function runPythonScriptWithExe(pythonExe, args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonExe, args, {
      cwd: getBackendDir(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => {
      const text = d.toString();
      stderr += text;
      process.stderr.write(`[Django] ${text}`);
    });
    proc.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`exit code ${code}\n\n${stderr.slice(0, 2000)}`));
    });
    proc.on('error', reject);
  });
}

async function ensureVenvForPython(pythonInfo, env) {
  if (typeof pythonInfo === 'string') {
    // Bundled venv worked — use it directly
    return pythonInfo;
  }

  // Create a fresh venv in userData
  const userDataPath = app.getPath('userData');
  const venvDir = path.join(userDataPath, 'venv');
  const venvPython = process.platform === 'win32'
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');

  if (fs.existsSync(venvPython)) {
    writeLog('User venv already exists');
    return venvPython;
  }

  writeLog(`Creating venv at ${venvDir}...`);
  let venvCreated = false;
  try {
    await runPythonScriptWithExe(pythonInfo.exe, ['-m', 'venv', venvDir], env);
    writeLog('Venv created');
    venvCreated = true;
  } catch (err) {
    writeLog(`venv module failed: ${err.message.slice(0, 100)}`);
    // Try without ensurepip (some embedded Pythons lack it)
    try {
      await runPythonScriptWithExe(pythonInfo.exe, ['-m', 'venv', '--without-pip', venvDir], env);
      writeLog('Venv created (without pip)');
      venvCreated = true;
    } catch (err2) {
      writeLog(`venv (no pip) also failed: ${err2.message.slice(0, 100)}`);
    }
  }
  if (!venvCreated) {
    // Try virtualenv (for portable/embedded Python without venv module)
    try {
      await runPythonScriptWithExe(pythonInfo.exe, ['-m', 'virtualenv', venvDir], env);
      writeLog('Venv created via virtualenv');
      venvCreated = true;
    } catch (err3) {
      writeLog(`virtualenv also failed: ${err3.message.slice(0, 100)}`);
    }
  }
  if (!venvCreated) {
    writeLog('All venv creation methods failed');
    return pythonInfo.exe; // Fall back to system/portable Python directly
  }

  // Install requirements
  const reqPath = path.join(getBackendDir(), 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    writeLog('Installing requirements...');
    try {
      await runPythonScriptWithExe(venvPython, ['-m', 'pip', 'install', '-r', reqPath], env);
      writeLog('Requirements installed');
    } catch (err) {
      writeLog(`pip install failed: ${err.message}`);
      // Try upgrading pip first
      try {
        await runPythonScriptWithExe(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip'], env);
        await runPythonScriptWithExe(venvPython, ['-m', 'pip', 'install', '-r', reqPath], env);
        writeLog('Requirements installed after pip upgrade');
      } catch (err2) {
        writeLog(`pip install failed after upgrade: ${err2.message}`);
        return pythonInfo.exe; // Fall back to system Python
      }
    }
  }

  return venvPython;
}

function runPythonScript(args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(getPythonCmd(), args, {
      cwd: getBackendDir(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => {
      const text = d.toString();
      stderr += text;
      process.stderr.write(`[Django] ${text}`);
    });
    proc.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(`exit code ${code}\n\n${stderr.slice(0, 2000)}`));
    });
    proc.on('error', reject);
  });
}

function writeLog(msg) {
  try {
    const logPath = path.join(app.getPath('userData'), 'app.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${msg}\n`);
  } catch (_) {}
}

function waitForBackend(url, maxRetries = 60) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    function check() {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        retries++;
        if (retries > maxRetries) {
          reject(new Error('Backend did not start in time'));
        } else {
          setTimeout(check, 1000);
        }
      });
    }
    check();
  });
}

async function startBackend(env) {
  const backendDir = getBackendDir();
  const pythonExe = getResolvedPythonExe();
  const runWithPython = (args) => runPythonScriptWithExe(pythonExe, args, env);

  writeLog('Running migrations...');
  try {
    await runWithPython(['manage.py', 'migrate', '--noinput']);
    writeLog('Migrations applied');
  } catch (err) {
    writeLog(`Migration failed: ${err.message}`);
    const stderr = err.message;
    if (stderr.includes('no such table') || stderr.includes('OperationalError') || stderr.includes('unable to open database')) {
      dialog.showErrorBox('Database Error',
        'The database could not be created or accessed.\n\n' +
        'This usually means:\n' +
        '1. Antivirus is blocking file access (try adding an exclusion)\n' +
        '2. The app does not have permission to write to the data directory\n' +
        '3. Another instance of the app is running\n\n' +
        `Details:\n${err.message.slice(0, 1000)}`);
    } else if (stderr.includes('ModuleNotFoundError') || stderr.includes('ImportError')) {
      dialog.showErrorBox('Missing Dependencies',
        'Some Python packages are missing or could not be installed.\n\n' +
        'Try running the following in a terminal:\n' +
        `  cd "${backendDir}"\n` +
        `  "${pythonExe}" -m pip install -r requirements.txt\n\n` +
        `Details:\n${err.message.slice(0, 1000)}`);
    } else {
      dialog.showErrorBox('Database Migration Error',
        'The database migration failed.\n\n' +
        'This can happen if the app was not installed correctly.\n' +
        'Please try reinstalling Aeris.\n\n' +
        `Details:\n${err.message.slice(0, 1500)}`);
    }
    return false;
  }

  writeLog('Seeding admin...');
  try {
    await runWithPython(['manage.py', 'seed_default_admin']);
    writeLog('Admin seeded');
  } catch (err) {
    writeLog(`Seed skipped: ${err.message}`);
  }

  writeLog('Starting Django server...');
  djangoProcess = spawn(pythonExe, ['manage.py', 'runserver', `0.0.0.0:${BACKEND_PORT}`, '--noreload'], {
    cwd: backendDir,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  djangoProcess.stdout.on('data', (data) => {
    writeLog(`[Django] ${data.toString().trim()}`);
  });

  djangoProcess.stderr.on('data', (data) => {
    writeLog(`[Django] ${data.toString().trim()}`);
  });

  djangoProcess.on('error', (err) => {
    writeLog(`Failed to start: ${err.message}`);
    dialog.showErrorBox('Backend Error', `Failed to start backend:\n${err.message}`);
  });

  djangoProcess.on('exit', (code) => {
    writeLog(`Exited with code ${code}`);
    djangoProcess = null;
  });

  return true;
}

function startAIService() {
  const backendDir = getBackendDir();
  const aiDir = path.resolve(backendDir, '..', 'ai-service');
  const env = {
    ...process.env,
    PYTHONPATH: aiDir,
    BACKEND_API_URL: `http://localhost:${BACKEND_PORT}/api`,
    DEVICE: 'cpu',
    DEFAULT_CONF_THRESHOLD: '0.5',
    FRAME_SKIP: '2',
    DETECTION_FPS: '10.0',
    PYTHONUNBUFFERED: '1',
  };

  if (!fs.existsSync(path.join(aiDir, 'app', 'api.py'))) {
    writeLog('AI service directory not found, skipping');
    return;
  }

  const pyExe = getResolvedPythonExe();
  writeLog(`Starting AI service with ${pyExe} from ${aiDir}...`);
  aiProcess = spawn(pyExe, ['-m', 'uvicorn', 'app.api:app', '--host', '0.0.0.0', '--port', String(AI_PORT)], {
    cwd: aiDir,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  aiProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    writeLog(`[AI] ${msg}`);
    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(path.join(logDir, 'ai-service.log'), `${new Date().toISOString()} ${msg}\n`);
    } catch (_) {}
  });

  aiProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    writeLog(`[AI] ${msg}`);
    try {
      const logDir = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(path.join(logDir, 'ai-service.log'), `${new Date().toISOString()} [stderr] ${msg}\n`);
    } catch (_) {}
  });

  aiProcess.on('error', (err) => {
    writeLog(`AI not available: ${err.message}`);
  });

  aiProcess.on('exit', (code) => {
    writeLog(`AI exited with code ${code}`);
    aiProcess = null;
    if (code !== 0 && aiRestartCount < AI_MAX_RESTARTS) {
      aiRestartCount++;
      writeLog(`AI service crashed (code ${code}), restarting in ${AI_RESTART_DELAY_MS / 1000}s... (attempt ${aiRestartCount}/${AI_MAX_RESTARTS})`);
      setTimeout(() => startAIService(), AI_RESTART_DELAY_MS);
    } else if (code !== 0) {
      writeLog(`AI service failed after ${AI_MAX_RESTARTS} restart attempts. AI features will be unavailable.`);
    }
  });
}

function createWindow() {
  const url = isDev
    ? 'http://localhost:5173'
    : `http://localhost:${BACKEND_PORT}`;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    backgroundColor: '#1a1b1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(url);

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted navigations (normal when SPA routes change)
    if (errorCode === -3) return;
    writeLog(`did-fail-load: "${validatedURL}" — ${errorDescription} (${errorCode})`);
  });

  // Block ALL navigations from the renderer (SPA handles routing internally)
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    if (navUrl.startsWith('http://localhost')) return;
    writeLog(`Blocked navigation to: ${navUrl}`);
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    writeLog(`Blocked window.open: ${url}`);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Aeris - Incident Detection');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); });
}

function cleanup() {
  if (djangoProcess) {
    djangoProcess.kill('SIGTERM');
    djangoProcess = null;
  }
  if (aiProcess) {
    aiProcess.kill('SIGTERM');
    aiProcess = null;
  }
}

let resolvedPythonExe = null;

function getResolvedPythonExe() {
  if (resolvedPythonExe) return resolvedPythonExe;
  return getPythonCmd(); // fall back to bundled venv
}

app.whenReady().then(async () => {
  writeLog('App starting...');

  // Resolve Python first (try bundled venv, fall back to system)
  const backendDir = getBackendDir();
  const dbDir = getDbDir();
  const frontendDir = getFrontendDir();
  const env = {
    ...process.env,
    DESKTOP_MODE: 'true',
    DESKTOP_FRONTEND_DIR: frontendDir,
    DESKTOP_PORT: String(BACKEND_PORT),
    DEBUG: isDev ? 'True' : 'False',
    USE_HTTPS: 'False',
    CORS_ALLOWED_ORIGINS: `http://localhost:${BACKEND_PORT},http://localhost:5173,http://localhost:5174,http://192.168.100.93:${BACKEND_PORT}`,
    ALLOWED_HOSTS: 'localhost,127.0.0.1,192.168.100.93',
    REDIS_URL: '',
    CELERY_BROKER_URL: '',
    CELERY_RESULT_BACKEND: '',
    PYTHONUNBUFFERED: '1',
  };
  if (!isDev) {
    env.DESKTOP_DB_DIR = dbDir;
    const mediaDir = path.join(app.getPath('userData'), 'media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
    env.DESKTOP_MEDIA_DIR = mediaDir;
  }

  writeLog('Ensuring Python environment...');
  const pythonInfo = await ensurePythonWorks(env);
  if (!pythonInfo) {
    writeLog('No working Python found');
    dialog.showErrorBox('Python Not Found',
      'Python 3.10+ is required but was not found.\n\n' +
      'Please install Python from:\n' +
      'https://www.python.org/downloads/\n\n' +
      'Make sure to check "Add Python to PATH" during installation.\n' +
      'After installing Python, restart Aeris.');
    app.quit();
    return;
  }

  resolvedPythonExe = typeof pythonInfo === 'string'
    ? pythonInfo
    : await ensureVenvForPython(pythonInfo, env);
  writeLog(`Using Python: ${resolvedPythonExe}`);

  // Start AI service (non-fatal if it fails)
  startAIService();

  const backendStarted = await startBackend(env);
  if (!backendStarted) {
    writeLog('Backend failed to start, quitting');
    app.quit();
    return;
  }

  writeLog('Waiting for backend to be ready...');
  try {
    await waitForBackend(`http://localhost:${BACKEND_PORT}`);
    writeLog('Backend is ready');
  } catch (err) {
    writeLog(`Backend timeout: ${err.message}`);
    dialog.showErrorBox('Backend Error',
      'The backend server failed to start in time.\n\n' +
      `Check the log file for details:\n${path.join(app.getPath('userData'), 'app.log')}`);
    app.quit();
    return;
  }

  // Wait for AI service to be ready too
  writeLog('Waiting for AI service to be ready...');
  try {
    await waitForBackend(`http://localhost:${AI_PORT}`, 90);
    writeLog('AI service is ready');
  } catch (err) {
    writeLog(`AI service timeout: ${err.message}`);
    // Non-fatal — proxy returns 503, but app can still work
  }

  createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanup();
});
