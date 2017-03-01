import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import os from 'os';
import fs from 'mz/fs';
import path from 'path';
import uuid from 'node-uuid';
import pageLoader from '../src/';

const testDirPrefix = 'page-loader-test-';
const getTmpDir = async () => {
  const result = await fs.mkdtemp(path.join(os.tmpdir(), testDirPrefix));
  return result;
};

axios.defaults.adapter = httpAdapter;

describe('test page-loader', () => {
  beforeEach(() => {
    nock('http://www.google.com')
      .get('/')
      .reply(200, 'Hello from Google!')
      .get('/wrong')
      .reply(404);
  });

  test('uploaded successfully', async (done) => {
    const filename = 'www-google-com.html';
    const content = 'Hello from Google!';

    const tmpdir = await getTmpDir();
    const result = await pageLoader('http://www.google.com', tmpdir);
    const expectedContent = await fs.readFile(path.join(tmpdir, filename), 'utf8');

    expect(expectedContent).toBe(content);
    expect(result).toBe('Page uploaded successfully');
    done();
  });

  test('404 Not Found', async (done) => {
    const tmpdir = await getTmpDir();

    const result = await pageLoader('http://www.google.com/wrong', tmpdir);
    const files = await fs.readdir(tmpdir);

    expect(result).toBe('Request failed with status code 404');
    expect(files.length).toBe(0);
    done();
  });

  test('output directory does not exist', async (done) => {
    const nonExistentDir = path.join(os.tmpdir(), uuid.v1());
    const result = await pageLoader('http://www.google.com', nonExistentDir);
    expect(result).toBe(`No such directory '${nonExistentDir}'`);
    done();
  });
});
