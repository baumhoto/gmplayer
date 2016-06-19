const Q = require('q');
const chalk = require('chalk');
const readline = require('readline-sync');
const cli = require('cli');
const utils = require('./utils');

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

function search (query, resultsFilter) {
  var deferred = Q.defer();
  global.playmusic.init({email: utils.settings().email, password: utils.settings().password}, (err) => {
    if (err) {
      cli.spinner('', true);
      cli.error(err);
      deferred.reject(err);
      return;
    }

    if (cli.options.library) {
      global.playmusic.getAllTracks((err, all) => {
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
      global.playmusic.search(query, 20, (err, results) => {
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

function track(query) {
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

function album(query) {
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

module.exports = {
  "album": album,
  "track": track
}
