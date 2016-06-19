const readline = require('readline-sync');
const playmusic = new (require('playmusic'))();
const cli = require('cli');

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
  play(playlistFile, true);
}

function track(file, playlist) {
  playlist = !!playlist; // default to false

  var player = mplayer('mplayer', mplayerArgs(file, playlist));
  var isfiltered = false;
  console.log('Playing ' + path.basename(file) + '\n');

  player.stdout.on('data', (data) => {
    if (data.toString().substr(0,2) == 'A:' && !isfiltered) {
      player.stdout.pipe(process.stdout);
      isfiltered = true;
    }
  });

  // FIXME: In order for the input piping to mplayer to work I need to require this.
  require('readline').createInterface({input : process.stdin, output : process.stdout});
  process.stdin.pipe(player.stdin);

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
