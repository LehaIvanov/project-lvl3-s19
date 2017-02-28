import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import os from 'os';
import fs from 'fs';
import pageLoader from '../src/';

const testDirPrefix = 'uploadPageTest';

axios.defaults.adapter = httpAdapter;

//beforeAll(() => {
  //fs.rmdirSync(`${os.tmpdir()}/${testDirPrefix}*`);
//});

describe('upload page', async () => {
  const path = fs.mkdtempSync(`${os.tmpdir()}/${testDirPrefix}`);

  console.log('path = ', path);

  const host = 'http://www.google.com';
  const content = 'Hello from Google!';
  nock(host).get('/').reply(200, content);

  await pageLoader(host, path);

  const expected = fs.readFileSync(`${path}/www-google-com.html`);
  expect(expected).toBe(content);
});
