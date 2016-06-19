#! /usr/bin/env node
//Importing local modules
const utils = require('./utils');
const play = require('./play');
const download = require('./download');
const lookup = require('./lookup');

const cli = require('cli');

global.playmusic = new (require('playmusic'))();

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
    lookup.track(options.song)
      .then(download.track)
      .then(play.track);
  }
  else if (options.album) {
    lookup.album(options.album)
      .then(download.album)
      .then(play.album)
  }
  else {
    cli.getUsage();
  }
});
