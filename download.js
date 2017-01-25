const mkdirp = require('mkdirp');
const Q = require('q');
const m3uWriter = require('m3u').extendedWriter();
const utils = require('./utils');
const fs = require('fs');
const http = require('https');

var cli = require('cli');

function track(trk) {
  var deferred = Q.defer();

  var songPath = utils.get('trackpath', trk);
  var songDirectory = utils.get('trackdir', trk);

  if (fs.existsSync(songPath)) {
    console.log('Song already found in offline storage, playing that instead.');
    deferred.resolve(songPath);

    return deferred.promise;
  }

  global.playmusic.getStreamUrl(trk.id != null ? trk.id : trk.nid, (err, url) => {
    if (err) {
      cli.error(err);
      deferred.reject(err);
      return;
    }

    mkdirp(songDirectory, (err) => {
      if (err) cli.error(err);

      http.get(url, (res) => {
        var size = parseInt(res.headers['content-length']);
        if (cli.options.song) console.log('Downloading ' + utils.customNaming(utils.settings().tracknaming, trk));

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
          trk.artfile = utils.get('temp') + trk.albumId + '.jpg';

          if (fs.existsSync(trk.artfile)) {
            utils.metadata(songPath, trk, () => {
              if (cli.options.song && cli.options.downloadonly) process.exit();
              if (cli.options.album) cli.progress(++cli.album.size/ cli.album.total);
              deferred.resolve(songPath);
            });
          }
          else {
            require('http').get(trk.albumArtRef[0].url, (res) => {
              res.on('data', (data) => {
                if (!fs.existsSync(trk.artfile)) {
                  fs.writeFileSync(trk.artfile, data);
                } else {
                  fs.appendFileSync(trk.artfile, data);
                }
              });

              res.on('end', () => {
                  utils.metadata(songPath, trk, () => {
                    if (cli.options.song && cli.options.downloadonly) process.exit();
                    if (cli.options.album) cli.progress(++cli.album.size/ cli.album.total);
                    deferred.resolve(songPath);
                  });
              });
            });
          }
        });
      });
    })
  });

  return deferred.promise;
}

function album(album) {
  var deferred = Q.defer();
  var lastDownload = Q('dummy');

  global.playmusic.getAlbum(album.albumId, true, (err, fullAlbumDetails) => {
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

    fullAlbumDetails.tracks.forEach((trk) => {
      track.albumArtist = fullAlbumDetails.albumArtist;
      m3uWriter.file(utils.get('trackname', trk));

      lastDownload = lastDownload.then((value) => {
        return track(trk)
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
  album: album,
  track: track
}
