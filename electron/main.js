const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const SecretManager = require('./SecretManager');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverCleanup = null;
let secretManager = null;

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
    icon: path.join(__dirname, '../assets/icons/icon.png')
  });

  // Start the backend server
  startBackendServer();

  // Load the frontend with delay to allow server startup
  setTimeout(() => {
    if (isDev) {
      // In development, connect to Vite dev server
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      // In production, serve from built files inside asar
      const indexPath = path.join(__dirname, '../client/dist/index.html');
      console.log('📄 Loading frontend from:', indexPath);
      mainWindow.loadFile(indexPath);
    }
  }, isDev ? 1000 : 3000); // 1s for dev, 3s for production

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
    if (serverCleanup) {
      serverCleanup();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startBackendServer() {
  try {
    // Initialize secret manager
    if (!secretManager) {
      secretManager = new SecretManager(app);
    }

    // Get or generate JWT secret
    const jwtSecret = secretManager.getOrCreateJwtSecret();

    // Set environment variables before requiring server
    process.env.NODE_ENV = isDev ? 'development' : 'production';
    process.env.ELECTRON_APP = 'true';
    process.env.PORT = '3001';
    process.env.ODYSSEUS_DATA_DIR = app.getPath('userData');
    process.env.JWT_SECRET = jwtSecret;

    console.log('🚀 Starting embedded backend server');
    console.log('📁 User data path:', app.getPath('userData'));
    console.log('🔧 Environment:', { 
      NODE_ENV: process.env.NODE_ENV, 
      ELECTRON_APP: process.env.ELECTRON_APP,
      ODYSSEUS_DATA_DIR: process.env.ODYSSEUS_DATA_DIR,
      JWT_SECRET: jwtSecret ? '***SET***' : '***MISSING***'
    });

    // Server is always in the same relative location (inside app.asar in production)
    const serverPath = path.join(__dirname, '../server/dist/index.js');
    
    console.log('📄 Loading server from:', serverPath);

    // Import and start the server directly in the main process
    const server = require(serverPath);
    
    // The server module should export a cleanup function or httpServer instance
    // Store it so we can close it on app quit
    if (server && typeof server.close === 'function') {
      serverCleanup = () => server.close();
    } else if (server && server.httpServer) {
      serverCleanup = () => server.httpServer.close();
    }

    console.log('✅ Backend server started successfully');
  } catch (error) {
    console.error('❌ Failed to start backend server:', error);
    dialog.showErrorBox(
      'Server Error', 
      `Failed to start backend server:\n\n${error.message}\n\nStack:\n${error.stack}`
    );
  }
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverCleanup) {
      serverCleanup();
    }
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

// Handle app termination
process.on('SIGTERM', () => {
  if (serverCleanup) {
    serverCleanup();
  }
  app.quit();
});

process.on('SIGINT', () => {
  if (serverCleanup) {
    serverCleanup();
  }
  app.quit();
});
