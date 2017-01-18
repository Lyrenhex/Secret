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

const electron = require("electron");
// import openpgp, so that we can encrypt and stuff - important!
// (we originally planned on using GPG, but node.js modules are lacking...)
const pgp = require ( 'openpgp' );
pgp.initWorker ();

pgp.config.aead_protect = true;

var USER;
var KEY;

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(`${__dirname}/res/js/jquery.min.js`);

$(document).ready (function(){
  showLoad();
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBP5eK0WUb8GQxpASOy5qmuB7r3qHSj9iA",
    authDomain: "freechat-projects-27e2b.firebaseapp.com",
    databaseURL: "https://freechat-projects-27e2b.firebaseio.com",
    storageBucket: "freechat-projects-27e2b.appspot.com",
    messagingSenderId: "28100702440"
  };
  firebase.initializeApp(config);

  var database = firebase.database();

  electron.ipcRenderer.on('user-msgs', function(event, user, key){
    USER = user;
    KEY = key;

    document.title = `Secret Messages: ${user}`;
    document.getElementById('user-title').textContent = user;

    var userid;
    database.ref(`/secret/usermap/${user}`).once('value', snap => {
      userid = snap.val();

      var msgsRef = database.ref(`/${userid}/secret/messages`);
      msgsRef.on('child_added', snap => {
        // yo, decrypt & add the message 'ere
        console.log(snap);
      });

      hideLoad();
    });
  });
});

function showLoad () {
  document.getElementById('dark-back').classList.add ('display');
  document.getElementById('load-front').classList.add ('display');
}
function hideLoad () {
  document.getElementById('dark-back').classList.remove ('display');
  document.getElementById('load-front').classList.remove ('display');
}
function showModal (id) {
  document.getElementById('dark-back').classList.add ('display');
  document.getElementById(id).classList.add ('display');
}
function hideModal (id) {
  document.getElementById('dark-back').classList.remove ('display');
  document.getElementById(id).classList.remove ('display');
}
