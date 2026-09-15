const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

app.setName('Mesailerim');

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: '#f5f2e9',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
