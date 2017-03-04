#!/usr/bin/env node

import commander from 'commander';
import run from '../';
import pjson from '../../package.json';

commander
  .version(pjson.version)
  .arguments('<url>')
  .description('Loads the page by url.')
  .option('-o, --output [directory]', 'Location where you want to save the file')
  .action(async (url, options) => {
    try {
      const result = await run(url, options.output);
      console.log(result);
    } catch (err) {
      console.error(err.message);
    }
  })
  .parse(process.argv);
