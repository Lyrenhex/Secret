/*
Secret GnuPG Simple Material Design Encryption Tool
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

const electron = require("electron");
// we need access to the filesystem
const fs = require ( 'fs' );
// import openpgp, so that we can encrypt and stuff - important!
// (we originally planned on using GPG, but node.js modules are lacking...)
const pgp = require ( 'openpgp' );
pgp.initWorker ();

pgp.config.aead_protect = true;

// if it doesn't exist, make the keys folder
fs.mkdir ( 'keys', 0777, function ( error ) {
  if ( error ) {
    if ( error.code !== "EEXIST" ) {
      console.log ( 'We couldn\'t make the keys folder', error );
    }
  }
} );

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(`${__dirname}/res/js/jquery.min.js`);

electron.ipcRenderer.on ( 'log', function ( event, message ) {
  console.log(message);
} );

$(document).ready( function () {

} );

function newKeyPair () {
  document.getElementById ( 'newkey-loader' ).classList.add ( 'display' );
  console.log('generating new keypair');

  var options = {
    userIds: { name: 'Damian Heaton', email: 'dh64784@gmail.com' },
    numBits: 4096,
    passphrase: 'password'
  }

  pgp.generateKey ( options ).then ( function ( key ) {
    console.log( key.privateKeyArmored, key.publicKeyArmored );
    fs.writeFile ( `keys/${options.userIds.name} [${options.userIds.email}].priv.asc`, key.privateKeyArmored, function ( error ) {
      if ( error ) {
        console.log ( 'We couldn\'t write the private key', error );
      }
    } );

    fs.writeFile ( `keys/${options.userIds.name} [${options.userIds.email}].pub.asc`, key.publicKeyArmored, function ( error ) {
      if ( error ) {
        console.log ( 'We couldn\'t write the public key', error );
      }
    } );

    // add the key to the listings
    document.getElementById ( 'newkey-loader' ).classList.remove ( 'display' );
  } );
}
