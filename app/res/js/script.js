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
// import openpgp, so that we can encrypt and stuff - important!
// (we originally planned on using GPG, but node.js modules are lacking...)
const pgp = require ( 'openpgp' );
pgp.initWorker ();

pgp.config.aead_protect = true;

var USER;
var key = {
  secret: null,
  password: null
};

// we have to import jQuery weirdly because of Electron
window.$ = window.jQuery = require(`${__dirname}/res/js/jquery.min.js`);

electron.ipcRenderer.on ( 'log', function ( event, message ) {
  console.log(message);
} );

$(document).ready( function () {
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

  var auth = firebase.auth();
  var database = firebase.database();
  auth.onAuthStateChanged(function(user){
    hideLoad();
    if(user){
      if(user.displayName){
        // signed in -- do some fancy stuff
        database.ref(`/${user.uid}/secret/data/seckey`).on('value', function(snapshot) {
          console.log(snapshot.val());
          key.secret = pgp.key.readArmored(snapshot.val()).keys[0];
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

  $("#register").submit(function(e){
    e.preventDefault();
    var email = $("#reg-email").val().toString();
    key.password = $("#reg-password").val().toString();

    hideModal('login-modal');

    firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
      console.log(error);
      showModal('login-modal');
      alert("Could not register account: " + error.message);
    });
  });
  $("#login").submit(function(e){
    e.preventDefault();
    var email = $("#login-email").val().toString();
    key.password = $("#login-password").val().toString();

    hideModal('login-modal');

    firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
      console.log(error);
      showModal('login-modal');
      alert("Could not sign in: " + error.message);
    });
  });
  $("#setun").submit(function(e){
    e.preventDefault();
    var username = $("#setun-un").val().toString();
    console.log(username);

    firebase.database().ref('/secret/usermap').once('value', function(snapshot) {
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
          database.ref(`/secret/usermap/${username}`).set(USER.uid);
          newKeyPair();
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
    });
  });

  $(window).unload(function(e){
    e.preventDefault();
    firebase.auth().signOut().then(function(){
      // signed out
      window.close();
    }, function(e){
      // didn't sign out ... ?
      window.close();
    });
  });
} );

function newKeyPair () {
  console.log('generating new keypair');

  showModal ('newkey-modal');

  $('#newkey').submit(function(e){
    e.preventDefault();

    var options = {
      userIds: { name: $('#newkey-name').val().toString(), email: USER.emailAddress },
      numBits: parseInt($('#newkey-bits').val()),
      passphrase: password
    }

    hideModal ('newkey-modal');

    showLoad();

    pgp.generateKey ( options ).then ( function ( key ) {
      console.log( key.privateKeyArmored, key.publicKeyArmored );

      // note: the following database set commands are in a set order. it is IMPERATIVE that they are not flipped; flipping them desyncs the numbers.
      firebase.database().ref(`/secret/pubkeys/${USER.uid}`).set(key.publicKeyArmored);
      firebase.database().ref(`/${USER.uid}/secret/data/seckey`).set(key.privateKeyArmored);

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
