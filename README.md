[![Travis CI Build Status](https://img.shields.io/travis/com/Richienb/rosav/master.svg?style=for-the-badge)](https://travis-ci.com/Richienb/rosav)
[![CodeFactor Score](https://www.codefactor.io/repository/github/richienb/rosav/badge?style=for-the-badge)](https://www.codefactor.io/repository/github/richienb/rosav)
[![NPM](https://nodei.co/npm/rosav.png?mini=true)](https://nodei.co/npm/rosav)

[![ROS AV](https://a.icons8.com/kTZddigl/FNiIO4/ros-av.svg)](#)

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

## TODO

- Catch all errors
- Use asynchronous functions
- Add a progress bar to display during scanning
- Migrate core functions of the CLI to `index.js`
- Allow specifying custom regex to match directories
