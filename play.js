const readline = require('readline-sync');
const mplayer = require('child_process').spawn;
const cli = require('cli');
const os = require('os');

function mplayerArgs (filename, isPlaylist) {
  var audioEngines = {
    linux: 'alsa',
    darwin: 'coreaudio'
  }

  var audioEngine = audioEngines[os.platform()];

  if (isPlaylist) {
    return ['-ao', audioEngine, '-playlist', filename];
  }

  return ['-ao', audioEngine, filename];
}

function album(playlistFile) {
  track(playlistFile, true);
}

//FIXME: For some reason mplayer quits after a few seconds of playing a song.
function track(file, playlist) {
  playlist = !!playlist; // default to false

  var player = mplayer('mplayer', mplayerArgs(file, playlist), {stdio: 'inherit'});
  var isfiltered = false;
  console.log('Playing ' + path.basename(file) + '\n');

  player.on('error', (data) => {
    cli.fatal('There was an error playing your song, maybe you need to install mplayer?');
  });

  player.on('exit', () => {
    process.exit();
  });
}

module.exports = {
  "album": album,
  "track": track
}
