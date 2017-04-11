# Hexlet project project-lvl3-s19

[![Build Status](https://travis-ci.org/LehaIvanov/project-lvl3-s19.svg?branch=master)](https://travis-ci.org/LehaIvanov/project-lvl3-s19)
[![Code Climate](https://codeclimate.com/github/LehaIvanov/project-lvl3-s19/badges/gpa.svg)](https://codeclimate.com/github/LehaIvanov/project-lvl3-s19)
[![Test Coverage](https://codeclimate.com/github/LehaIvanov/project-lvl3-s19/badges/coverage.svg)](https://codeclimate.com/github/LehaIvanov/project-lvl3-s19/coverage)
[![Issue Count](https://codeclimate.com/github/LehaIvanov/project-lvl3-s19/badges/issue_count.svg)](https://codeclimate.com/github/LehaIvanov/project-lvl3-s19)

### Install
```
git clone https://github.com/LehaIvanov/project-lvl3-s19.git
cd project-lvl3-s19/
npm link

```

### Usage
```
page-loader --help

  Usage: page-loader [options] <url>

  Loads the page by url.

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -o, --output [directory]  Location where you want to save the file
```

```
import pageLoader from 'page-loader-lvl3-s19-ai';

pageLoader('https://www.google.com/', '/var/tmp').then((result) => {
  console.log(result);
});
```

The default download location is './'.
