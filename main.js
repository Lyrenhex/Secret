/*
Secret OpenPGP Simple Material Design Encryption Tool
Copyright (C) 2016  Damian Heaton

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
this thing's gonna need GPG installed and in the PATH. deal with that eventually.
*/

if( require( 'electron-squirrel-startup' ) ) return;

// grab some important things from electron
const { app, BrowserWindow, ipcMain } = require ( 'electron' );

// prevent JS garbage collection killing window
let win;
let contents;

var ico = `${__dirname}/app/res/img/icon.ico`;

function spawnWin () {
  // spawn the window
  win = new BrowserWindow ( {
    width: 900,
    height: 700,
    icon: ico
  } );
  // grab the content reference of the window
  contents = win.webContents;

  // and now load the UI
  win.loadURL ( `file://${__dirname}/app/index.html` );

  contents.on ( 'did-finish-load', function () {
    ipcMain.on ( 'messages', function (event, user, pass) {
      messages (user, pass);
    } );
  } );
}

function messages (user, pass) {
  var msgWin = new BrowserWindow ( {
    width: 900,
    height: 700,
    icon: ico
  } );

  msgWin.loadURL ( `file://${__dirname}/app/messages.html `);

  msgWin.webContents.on ( 'did-finish-load', function() {
    msgWin.webContents.send ( 'user-msgs', user, pass );
  } );
}

// when we're clear to go, do things in spawnWin()
app.on ( 'ready', spawnWin );

// all the windows were closed; quit app
app.on ( 'window-all-closed', function () {
  // mac's weird, so don't quit on mac... ?
  if (process.platform !== 'darwin') {
    app.quit ();
  }
} );

app.on ( 'activate', function () {
  // more funky mac shit
  if (win == null) {
    spawnWin ();
  }
} );
