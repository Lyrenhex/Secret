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

var keys = 1;
var USER;

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
  showLoad();
  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBJD3Yzn8oBmZZvI6QdlwbHDbICQadnohQ",
    authDomain: "secret-411a9.firebaseapp.com",
    databaseURL: "https://secret-411a9.firebaseio.com",
    storageBucket: "secret-411a9.appspot.com",
    messagingSenderId: "448282861257"
  };
  firebase.initializeApp(config);

  var auth = firebase.auth();
  var database = firebase.database();
  auth.onAuthStateChanged(function(user){
    hideLoad();
    if(user){
      // signed in -- do some fancy stuff
      firebase.database().ref(`/${user.uid}/data/seckeys`).on('child_added', function(snapshot) {
        console.log(snapshot.val());
        // add the key's card to the keys list thingy
        keys++;
      });
      USER = user;
    }else{
      // not signed in -- log in / register
      showModal ('login-modal');
    }
  });

  $("#register").submit(function(e){
    e.preventDefault();
    var email = $("#reg-email").val().toString();
    var pass = $("#reg-password").val().toString();

    firebase.auth().createUserWithEmailAndPassword(email, pass).catch(function(error) {
      console.log(error);
    });

    hideModal('login-modal');
  });
  $("#login").submit(function(e){
    e.preventDefault();
    var email = $("#login-email").val().toString();
    var pass = $("#login-password").val().toString();

    firebase.auth().signInWithEmailAndPassword(email, pass).catch(function(error) {
      console.log(error);
    });

    hideModal('login-modal');
  });
} );

function newKeyPair () {
  console.log('generating new keypair');

  showModal ('newkey-modal');

  $('#newkey').submit(function(e){
    e.preventDefault();

    var options = {
      userIds: { name: $('#newkey-name').val().toString(), email: $('#newkey-email').val().toString() },
      numBits: parseInt($('#newkey-bits').val()),
      passphrase: $('#newkey-passphrase').val().toString()
    }

    hideModal ('newkey-modal');

    showLoad();

    pgp.generateKey ( options ).then ( function ( key ) {
      console.log( key.privateKeyArmored, key.publicKeyArmored );

      firebase.database().ref(`/${USER.uid}/data/seckeys/${keys}`).set(key.privateKeyArmored);
      firebase.database().ref(`/pubkeys/${USER.uid}/${keys}`).set(key.publicKeyArmored);

      hideLoad();
    } );
  });
}

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
