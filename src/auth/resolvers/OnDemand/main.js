const electron = require('electron')
var process = require('process');

// Module to control application life.
const app = electron.app
app.commandLine.appendSwitch('ignore-certificate-errors');
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
  let siteUrl = process.argv[2];
  if(siteUrl.endsWith('/')){
    siteUrl = siteUrl.slice(0, -1);
  }
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 500,
    height: 650,
    title: `Opening ${siteUrl}`,
    center: true,
    webPreferences: {
      webSecurity: false
    }
  });

  mainWindow.setMenu(null);
  // and load the index.html of the app.
  mainWindow.loadURL(siteUrl);

  mainWindow.webContents.on('did-finish-load', function (data) {
    let loadedUrl = mainWindow.webContents.getURL();

    if (loadedUrl.indexOf(siteUrl) !== -1 && (loadedUrl.indexOf(siteUrl + '/_layouts/15/start.aspx') !== -1 || loadedUrl.indexOf(siteUrl + '/_') === -1)) {
      let session = mainWindow.webContents.session;
      let host = url.parse(siteUrl).hostname;
      let isOnPrem = host.indexOf('.sharepoint.com') === -1 && host.indexOf('.sharepoint.cn') === -1;
      let domain;

      if (isOnPrem) {
        domain = host;
      } else if (host.indexOf('.sharepoint.com') !== -1) {
        domain = '.sharepoint.com';
      } else if (host.indexOf('.sharepoint.cn') !== -1) {
        domain = '.sharepoint.cn';
      } else {
        throw new Error('Unable to resolve domain');
      }

      session.cookies.get({ domain: domain }, (error, cookies) => {
        if (error) {
          console.log(error);
          throw error;
        }

        console.log('#{');
        cookies.forEach(function (cookie) {
          console.log(JSON.stringify(cookie));
          console.log(';#;');
        });
        console.log('}#');
        // mainWindow.close();
      })
    }
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

app.on('login', (event, webContents, request, authInfo, callback) => {
  event.preventDefault();
  let child = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    show: true,
    height: 100,
    width: 500
  });

  child.setMenu(null);
  child.loadURL(`file://${__dirname}/no-ntlm.html`);

  child.on('closed', function(){
    mainWindow.close();
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
