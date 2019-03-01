[![Travis CI Build Status](https://img.shields.io/travis/com/Richienb/rosav/master.svg?style=for-the-badge)](https://travis-ci.com/Richienb/rosav)
[![CodeFactor Score](https://www.codefactor.io/repository/github/richienb/rosav/badge?style=for-the-badge)](https://www.codefactor.io/repository/github/richienb/rosav)

[![ROS AV](https://a.icons8.com/kTZddigl/FNiIO4/ros-av.svg)](#)

[![NPM](https://nodei.co/npm/rosav.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/rosav)

A CLI that scans your files for matches to the VirusShare database.

Documentation available [here](https://richienb.github.io/rosav).

## Installation

### Prebuilt binary

Download [here](https://github.com/Richienb/rosav/releases/latest).

### Package manager

#### NPM

```sh
npm install -g rosav
```

#### Yarn

```sh
yarn global add rosav
```

## Command help

```
rosav --help
```

## CLI Colour Coding Guide

- <span style="color: red">Red</span>: Error
- <span style="color: yellow">Yellow</span>: Warning
- <span style="color: green">Green</span>: Success
- <span style="color: cyan">Cyan</span>: Progress
- <span style="color: magenta">Magenta</span>: Debug information

## Translation

Help translate ROS AV [here](https://translate.zanata.org/iteration/view/rosav/Main/languages).

## TODO

- [ ] Catch all errors
- [ ] Use asynchronous functions
- [x] Add a progress bar to display during scanning
- [ ] Migrate core functions of the CLI to `index.js`
- [x] Allow specifying custom regex to match directories
- [ ] Only scan for latest 1 million hashes as `Recent Malware Mode`
