## gmplayer

![gmplayer in urxvt](http://i.imgur.com/3jgTt3D.gif)

God, it's almost becoming my main thing. Making CLI based web streaming music players. I started with [gplayer](http://github.com/96aa48/gplayer.git) for Grooveshark, proceeded with [yplayer](http://github.com/96aa48/yplayer.git) for Youtube and now with gmplayer for Google Play Music. Just use it as before, but now with `gmp` and `gmplayer`. Use `-s` and then your search query. The player works with both Google Play All-Access and uploaded files using the `-l` flag.

I've reworked the project since version `v0.4.0` to be more readable for other developers. If you feel like you want to contribute to the project feel free to open an issue or a pull request.

## Install :
```
npm i gmplayer -g
```

### System Requirements
* [ffmpeg]: processing track meta-data
* [mplayer]: playing music (optional if you want to listen straight after download)

## Usage :
```
Usage:
  gmp [OPTIONS] [ARGS]

Options:
  -s, --song             The song you want to download/play.
  -a, --album            The album you want to download/play.
  -d, --downloadonly     If you only want to download the song instead of
                         playing it
  -l, --library          List all items from your library (only for songs) (In combination with either -s or -a)
  -h, --help             Display help and usage details

```

## LICENSE
Check out the `LICENSE` file for more information.

[ffmpeg]: https://ffmpeg.org/
[mplayer]: https://mplayerhq.hu/
