// Electron entry point — wraps the www/ HTML5 game in a desktop window so it
// can ship as a Windows .exe via electron-builder. The exact same www/ folder
// is what Capacitor bundles into the Android APK.
const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 540,
    height: 960,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#05060a',
    title: 'FLUSHED: Down the Drain',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'www', 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // No application menu — it's a game.
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // F11 toggles fullscreen; handy for an arcade feel.
  globalShortcut.register('F11', () => {
    if (win) win.setFullScreen(!win.isFullScreen());
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
