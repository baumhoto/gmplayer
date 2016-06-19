const mkdirp = require('mkdirp');
const Q = require('q');
const m3uWriter = require('m3u').extendedWriter();
const utils = require('./utils');

var cli = require('cli');

function track(track) {
  var deferred = Q.defer();

  var songPath = utils.get('trackpath', track);
  var songDirectory = utils.get('trackdir', track);

  if (fs.existsSync(songPath)) {
    console.log('Song already found in offline storage, playing that instead.');
    deferred.resolve(songPath);

    return deferred.promise;
  }

  global.playmusic.getStreamUrl(track.nid, (err, url) => {
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

function album(album) {
  console.log('Downloading an album', album);
  var deferred = Q.defer();
  var lastDownload = Q('dummy');

  global.playmusic.getAlbum(album.albumId, true, (err, fullAlbumDetails) => {
    console.log()
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
        return track(track);
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

module.exports = {
  "album": album,
  "track": track
}
