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
var keyData = {};
var uKeyData;
var acc_pass;

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
      if(user.displayName){
        // signed in -- do some fancy stuff
        database.ref(`/${user.uid}/data/seckeys`).on('child_added', function(snapshot) {
          console.log(snapshot.val());
          // add the key's card to the keys list thingy
          keys++;
        });
        document.getElementById('ui-username').textContent = user.displayName;
      }else{
        // they have no username -- we should ask them to set one
        showModal('setun-modal');
      }
      if(!user.emailVerified){
        // email isn't verified -- perhaps the account isn't who it purports to be? request that they verify their email.
        showModal('verify-email');
      }
      USER = user;
    }else{
      // not signed in -- log in / register
      showModal ('login-modal');
    }
  });

  fs.readFile ("keys.dat.json", function (err, data) {
    if (err) {
      if (err.code == "ENOENT") {
        console.log("keys.dat.json doesn't exist. should be fixed on close. all is well.")
      } else {
        // all isn't well; something else is wrong?
        throw err; // rethrow it. don't catch it.
      }
    } else {
      showModal('decrypt-password');
      // file loaded fine. assign parsed JSON to keyData
      // noting that this is asynchronous, in a *very* rare case we might have hit this point after already modifying the keyData object. thus, we should cycle through everything from the file's data and add it to the object; don't nuke the object.
      uKeyData = data;
    }
  });

  $("#register").submit(function(e){
    e.preventDefault();
    var email = $("#reg-email").val().toString();
    var pass = $("#reg-password").val().toString();

    hideModal('login-modal');

    firebase.auth().createUserWithEmailAndPassword(email, pass).catch(function(error) {
      console.log(error);
      showModal('login-modal');
      alert("Could not register account: " + error.message);
    });
  });
  $("#login").submit(function(e){
    e.preventDefault();
    var email = $("#login-email").val().toString();
    var pass = $("#login-password").val().toString();

    hideModal('login-modal');

    firebase.auth().signInWithEmailAndPassword(email, pass).catch(function(error) {
      console.log(error);
      showModal('login-modal');
      alert("Could not sign in: " + error.message);
    });
  });
  $("#setun").submit(function(e){
    e.preventDefault();
    var username = $("#setun-un").val().toString();
    console.log(username);

    firebase.database().ref('/usermap').once('value', function(snapshot) {
      console.log(snapshot);
      if(snapshot.hasChild(username)){
        // someone's already grabbed that username. tell the user and ask them to change it.
        alert("Whoops! That username's already been grabbed by someone else. How about you try something new?");
      }else{
        console.log("setting displayname");
        USER.updateProfile({
          displayName: username
        }).then(function(){
          // update successful. we can close the modal.
          hideModal('setun-modal');
          document.getElementById('ui-username').textContent = username;
          database.ref(`/usermap/${username}`).set(USER.uid);
        },
        function(err){
          // something went wrong
          console.log(err);
          alert("Umm... Something went wrong. :/ Take a look (and report it maybe?): " + err);
        });
      }
    });
    $('acc-pass').submit(function(e){
      e.preventDefault();
      acc_pass = $('acc-pass-pass').val().toString();
      hideModal('decrypt-password');

      pgp.decrypt() // TODO: create a generic account key on account creation, add stuff to encrypt the keys.dat.json file when saved and add stuff here to decrypt that file (all using the generic account key).
    });
  });

  $(window).unload(function() {
    showLoad();
    // save the keyData object. we should use blocking here; it should delay the window close (important!) and we've activated the loading screen.
    fs.writeFileSync ("keys.dat.json", JSON.stringify(keyData, null, 4));
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

      keyData[keys] = options.passphrase;

      // note: the following database set commands are in a set order. it is IMPERATIVE that they are not flipped; flipping them desyncs the numbers.
      firebase.database().ref(`/pubkeys/${USER.uid}/${keys}`).set(key.publicKeyArmored);
      firebase.database().ref(`/${USER.uid}/data/seckeys/${keys}`).set(key.privateKeyArmored);

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
