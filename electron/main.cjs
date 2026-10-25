'use strict';
/**
 * Electron main process.
 *
 * Security posture (see SECURITY.md):
 * - The renderer loads only the bundled local file; no remote content.
 * - contextIsolation + sandbox on, nodeIntegration off.
 * - All navigation, new windows and permission requests are denied.
 */
const path = require('node:path');
const { app, BrowserWindow, Menu, session, shell } = require('electron');

const INDEX_HTML = path.join(__dirname, '..', 'dist', 'index.html');
const DEV_URL = process.env.KIWISCOPE_DEV_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'KiwiScope',
    backgroundColor: '#0b1d12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  if (DEV_URL && !app.isPackaged) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(INDEX_HTML);
  }
  return win;
}

function hardenSessions() {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    // Pointer lock and fullscreen are the only things a shooter needs.
    callback(permission === 'pointerLock' || permission === 'fullscreen');
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://github.com/jpcaparas/kiwiscope')) shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.whenReady().then(() => {
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  hardenSessions();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
