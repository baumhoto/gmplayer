#! /usr/bin/env node
//Importing first party modules
const fs = require('fs');
const http = require('https');
const mplayer = require('child_process').spawn;
const os = require('os');

//Importing local modules
const utils = require('./utils');

//Importing playmusic
const playmusic = new (require('playmusic'))();

//Importing third party modules
const readline = require('readline-sync');
const chalk = require('chalk');
const m3uWriter = require('m3u').extendedWriter();
const Q = require('q');
const mkdirp = require('mkdirp');

var cli = require('cli');

var resultTypes = {
  track: '1',
  album: '3'
};

var filters = {
  onlyAlbums: (entry) => {
    return entry.type === resultTypes.album || entry.contentType == resultTypes.album;
  },

  onlyTracks: (entry) => {
    return entry.type === resultTypes.track || entry.contentType == resultTypes.track;
  }
};

cli.parse({
  song: ['s', 'The song you want to download/play.', 'string'],
  album: ['a', 'The album you want to download/play.', 'string'],
  library: ['l', 'List all items from your library (In combination with either -s or -a)'],
  downloadonly: ['d', 'If you only want to download the song instead of playing it (In combination with either -s or -a)'],
});

cli.main((args, options) => {
  utils.settings();
  cli.options = options;

  if (options.song) {
    lookup(options.song)
      .then(download)
      .then(play);
  }

  else if (options.album) {
    lookupAlbum(options.album)
      .then(downloadAlbum)
      .then(playAlbum)
  }

  else {
    cli.getUsage();
  }
});

function search (query, resultsFilter) {
  var deferred = Q.defer();

  playmusic.init({email: utils.settings().email, password: utils.settings().password}, (err) => {
    if (err) {
      cli.spinner('', true);
      cli.error(err);
      deferred.reject(err);
      return;
    }

    if (cli.options.library) {
      playmusic.getAllTracks((err, all) => {
       var results = all.data.items.filter((track) => {
          var match = track.title.match(query) + track.album.match(query) + track.artist.match(query);
          return match.length > 0;
        });

       if (results.length == 0) {
         cli.spinner('', true);
         cli.error('No songs/albums were found with your query in your library, please try again!');
       }

       return deferred.resolve(results.filter(resultsFilter));
      });
    }
    else {
      playmusic.search(query, 20, (err, results) => {
        if (err) {
          cli.spinner('', true);
          cli.error(err);
          return deferred.reject(err);
        }

        if (!results.entries) {
          cli.spinner('', true);
          cli.error('No songs/albums were found with your query, please try again!');
          return deferred.reject(err);
        }
        return deferred.resolve(results.entries.filter(resultsFilter));
      });
    }

  });

  return deferred.promise;
}

function lookup (query) {
  var deferred = Q.defer();

  cli.spinner('Looking up requested song');

  search(query, filters.onlyTracks).then((results) => {
    process.stdout.write('\n');

    if (results[0].type) {
      results.forEach((entry, index) => {
        console.log(chalk.yellow('[') + index + chalk.yellow('] ') + chalk.white(entry.track.title) + ' - ' + chalk.grey(entry.track.artist));
      });
    }
    else {
      results.forEach((entry, index) => {
        console.log(chalk.yellow('[') + index + chalk.yellow('] ') + chalk.white(entry.title) + ' - ' + chalk.grey(entry.artist));
      });
    }

    var input = readline.questionInt('What song do you want to play? #');
    cli.spinner('', true);

    deferred.resolve(results[input].track);
  });

  return deferred.promise;
}

function lookupAlbum (query) {
  var deferred = Q.defer();

  cli.spinner('Looking up requested album');

  search(query, filters.onlyAlbums).then((results) => {
    process.stdout.write('\n');

    results.forEach((entry, index) => {
      console.log(chalk.yellow('[') + index + chalk.yellow('] ') + chalk.white(entry.album.name) + ' - ' + chalk.grey(entry.album.artist));
    });

    var input = readline.questionInt('What album do you want to play? #');
    cli.spinner('', true);

    deferred.resolve(results[input].album);
  });

  return deferred.promise;
}

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

function playAlbum (playlistFile) {
  play(playlistFile, true);
}

function play(file, playlist) {
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

function download (track) {
  var deferred = Q.defer();

  var songPath = utils.get('trackpath', track);
  var songDirectory = utils.get('trackdir', track);

  if (fs.existsSync(songPath)) {
    console.log('Song already found in offline storage, playing that instead.');
    deferred.resolve(songPath);

    return deferred.promise;
  }

  playmusic.getStreamUrl(track.nid, (err, url) => {
    if (err) {
      cli.error(err);
      deferred.reject(err);
      return;
    }

    mkdirp(songDirectory, (err) => {
      if (err) cli.error(err);

      http.get(url, (res) => {
        var size = parseInt(res.headers['content-length']);
        if (cli.options.song) console.log('Downloading ' + utils.customNaming(utils.settings().tracknaming, track));

        res.on('data', (data) => {
          if (!fs.existsSync(songPath)) {
            fs.writeFileSync(songPath, data);
          } else {
            fs.appendFileSync(songPath, data);
          }
          var fileSize = fs.statSync(songPath).size;
          if (cli.options.song) cli.progress(fileSize / size);
        });

        res.on('end', () => {
          utils.metadata(songPath, track, () => {
            if (cli.options.song && cli.options.downloadonly) process.exit();
            if (cli.options.album) cli.progress(++cli.album.size/ cli.album.total);
            deferred.resolve(songPath);
          });

        });
      });
    })
  });

  return deferred.promise;
}

function downloadAlbum (album) {
  var deferred = Q.defer();
  var lastDownload = Q('dummy');

  playmusic.getAlbum(album.albumId, true, (err, fullAlbumDetails) => {
    if (err) {
      console.warn(err);
      deferred.reject(err);
    }

    console.log('Downloading ' + fullAlbumDetails.artist + ' - ' + fullAlbumDetails.name);
    cli.album = {
      'total': fullAlbumDetails.tracks.length,
      'size': 0
    };

    cli.progress(0 / cli.album.total);

    fullAlbumDetails.tracks.forEach((track) => {
      track.albumArtist = fullAlbumDetails.albumArtist;
      m3uWriter.file(utils.get('trackname', track));

      lastDownload = lastDownload.then(function(value) {
        return download(track);
      });
    });

    lastDownload.then(() => {
      cli.spinner('', true);
      if (cli.options.downloadonly) {
        utils.writePlaylist(m3uWriter, album);
        process.exit();
      }
      return utils.writePlaylist(m3uWriter, album);
    }).then(deferred.resolve);
  });

  return deferred.promise;
}
