const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let settingsWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 550,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: true,
    minWidth: 300,
    minHeight: 400,
    show: false,
    title: 'Pomodoro Timer'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle closing behavior - hide instead of close on macOS
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Determine proper icon path based on whether we're in development or production
  let iconPath;
  if (app.isPackaged) {
    // Production - need to use the app.getAppPath() approach
    iconPath = path.join(process.resourcesPath, 'icon.png');
  } else {
    // Development
    iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  }
  
  // Fallback to a basic version if the icon isn't found
  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.error('Failed to load tray icon:', error);
    // Create an alternative icon programmatically if the file is missing
    const { nativeImage } = require('electron');
    const image = nativeImage.createEmpty();
    const size = { width: 16, height: 16 };
    tray = new Tray(image.resize(size));  
  }
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Pomodoro Timer', 
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Pomodoro Timer');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// Create the settings window
function createSettingsWindow() {
  // If settings window already exists, just focus it
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 440,
    resizable: false,
    parent: mainWindow,
    modal: true,
    show: false,
    title: 'Pomodoro Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC handlers for settings
ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.on('settings-updated', (event, settings) => {
  // Forward settings to the main window
  if (mainWindow) {
    mainWindow.webContents.send('apply-settings', settings);
  }
});

app.on('ready', () => {
  createWindow();
  createTray();
  
  // Create application menu with settings option
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});