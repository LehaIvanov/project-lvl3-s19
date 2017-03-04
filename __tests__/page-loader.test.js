import nock from 'nock';
import os from 'os';
import fs from 'mz/fs';
import path from 'path';
import uuidV1 from 'uuid/v1';
import pageLoader from '../src/';

const testDirPrefix = 'page-loader-test-';
const fixturesPrefix = './__tests__/fixtures';
const getTmpDir = async () => {
  const result = await fs.mkdtemp(path.join(os.tmpdir(), testDirPrefix));
  return result;
};

describe('test page-loader', () => {
  beforeEach(() => {
    nock('http://www.google.com')
      .get('/')
      .reply(200, () => fs.createReadStream(path.resolve(fixturesPrefix, 'index.html')))
      .get('/wrong')
      .reply(404)
      .get('/images/favicon.ico')
      .reply(200, () => fs.createReadStream(path.resolve(fixturesPrefix, 'files', 'favicon.ico')))
      .get('/css/app.css')
      .reply(200, () => fs.createReadStream(path.resolve(fixturesPrefix, 'files', 'app.css')))
      .get('/js/app.js')
      .reply(200, () => fs.createReadStream(path.resolve(fixturesPrefix, 'files', 'app.js')));
    nock('https://cdn2.hexlet.io')
      .get('/assets/application.css')
      .reply(200, () =>
        fs.createReadStream(path.resolve(fixturesPrefix, 'files', 'hexlet-application.css')));
  });

  test('uploaded successfully', async () => {
    const expectFile = async (expectedFilePath, originalFilePath) => {
      const expectContent = await fs.readFile(expectedFilePath, 'utf8');
      const originalContent = await fs.readFile(originalFilePath, 'utf8');
      expect(expectContent).toBe(originalContent);
    };

    const tmpdir = await getTmpDir();
    const dirWithFiles = path.resolve(tmpdir, 'www-google-com_files');
    const files = [
      ['images-favicon.ico', 'favicon.ico'],
      ['css-app.css', 'app.css'],
      ['js-app.js', 'app.js'],
      ['cdn2-hexlet-io-assets-application.css', 'hexlet-application.css'],
    ];

    const result = await pageLoader('http://www.google.com', tmpdir);
    expect(result).toBe('Page uploaded successfully');

    await Promise.all(files.map((pair) => {
      const [expectedFile, correctFile] = pair;
      const expectedFilePath = path.resolve(dirWithFiles, expectedFile);
      const originalFilePath = path.resolve(fixturesPrefix, 'files', correctFile);
      return expectFile(expectedFilePath, originalFilePath);
    }));

    await expectFile(path.resolve(tmpdir, 'www-google-com.html'),
      path.resolve(fixturesPrefix, 'index-correct.html'));
    const filesNameList = await fs.readdir(dirWithFiles);

    expect(filesNameList.length).toBe(4);
  });

  test('404 Not Found', async () => {
    const tmpdir = await getTmpDir();
    const files = await fs.readdir(tmpdir);

    try {
      await pageLoader('http://www.google.com/wrong', tmpdir);
    } catch (err) {
      expect(err.message).toBe('Request failed with status code 404');
      expect(files.length).toBe(0);
    }
  });

  test('output directory does not exist', async () => {
    const nonExistentDir = path.join(os.tmpdir(), uuidV1());

    try {
      await pageLoader('http://www.google.com', nonExistentDir);
    } catch (err) {
      expect(err.message).toBe(`No such directory '${nonExistentDir}'`);
    }
  });
});
