const fs = require('fs');
const crypt = require('./crypt');
const readline = require('readline-sync');
const path = require('path');
const meta = require('ffmetadata');

function writePlaylist (writer, album) {
  /* FIXME
    This is a temp fix for a custonNaming function issue,
    the getAlbumDirectory is also called during the downloading of tracks
    but the within this context the supplied object is different (album instead of track)
  */
  album.album = album.name;
  var playlistPath = path.join(
    get('albumname', album),
    customNaming(settings().playlistnaming, album) + '.m3u'
  );

  fs.writeFileSync(playlistPath, writer.toString());

  return playlistPath;
}

function get(what, data) {
  if (what == 'location') {
    switch (data) {
      case 'settings':
        return process.env['HOME'] + '/.gmplayerrc';
        break;
      case 'music':
        return settings().musicdirectory;
        break;
    }
  }
  else if (what == "trackname") {
    return customNaming(settings().tracknaming, data) + '.mp3';
  }
  else if (what == "albumname") {
    return path.join(
      get('location', 'music'),
      customNaming(settings().albumnaming, data)
    );
  }
  else if (what == "trackdir") {
    return path.join(
      get('location', 'music'),
      customNaming(settings().albumnaming, data)
    );
  }
  else if (what == "trackpath") {
    return path.join(
      get('trackdir', data),
      get('trackname', data)
    );
  }
}

function sanitize (filename) {
  if (typeof filename !== 'string') { return; }
  return filename.replace(/\/|\\/g, '|');
}

function customNaming (string, info) {
  string = string.slice(); // duplicate string to avoid mutation issues

  for (var meta in info) {
    if (info.hasOwnProperty(meta)) {
      string = string.replace(new RegExp('{' + meta + '}', 'g'), sanitize(info[meta]));
    }
  }
  return string;
}

function metadata(path, data, cb) {
  var data = {
    artist: data.artist,
    album: data.album,
    track: data.trackNumber,
    title: data.title
  };

  meta.write(path, data, (err) => {
    if (err) console.warn(err);
    cb();
  });
}

function settings() {
  if (!fs.existsSync(get('location', 'settings'))) {
    var settings = {
      'email': 'add_your_email_here',
      'password': 'add_your_password_here',
      'musicdirectory': process.env["HOME"] + '/Music/gmplayer',
      'tracknaming': '{title} - {artist}',
      'albumnaming': '{album}',
      'playlistnaming': '{name} - {albumArtist}'
    };
    console.log('Initializing first time setup!');
    settings.email = readline.question('Please enter your email adress used for Google Services:\n');
    settings.password = crypt.encrypt(readline.question('Please enter your password:\n', {hideEchoBack: true}));

    fs.writeFileSync(get('location', 'settings'), JSON.stringify(settings, null, 2));
  }
  else {
    var settings = JSON.parse(fs.readFileSync(get('location', 'settings')));
    if (settings.email == 'add_your_email_here') cli.fatal('Go to ~/.gmplayerrc and add your email and password');
    else {
      settings.password = crypt.decrypt(settings.password);
      return settings;
    }
  }
}

module.exports = {
  "writePlaylist" : writePlaylist,
  "get" : get,
  "customNaming" : customNaming,
  "metadata" : metadata,
  "settings" : settings
}
