const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Set AppUserModelId for proper Windows taskbar icon
app.setAppUserModelId('com.evanmassi.odysseus');

let mainWindow;

// Keep a global reference of the window object
function createWindow() {
  console.log('🚀 Creating Electron window...');
  console.log('📁 __dirname:', __dirname);
  console.log('🔧 isDev:', isDev);

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1415,
    height: 860,
    minWidth: 1415,
    minHeight: 860,
    center: true,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../assets/icons/icon.ico')
  });

  // Load the frontend
  if (isDev) {
    // In development, connect to Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, serve from built files inside asar
    // Client connects to cloud API via environment variables baked in at build time
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    console.log('📄 Loading frontend from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
    mainWindow.maximize();
  });

  // Debug loading events
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Frontend loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Frontend failed to load:', errorCode, errorDescription);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});
