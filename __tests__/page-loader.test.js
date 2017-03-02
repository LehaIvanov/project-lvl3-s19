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
      .reply(404);
  });

  test('uploaded successfully', async () => {
    const filename = 'www-google-com.html';

    const content = await fs.readFile(path.resolve(fixturesPrefix, 'index.html'), 'utf8');
    const tmpdir = await getTmpDir();
    const result = await pageLoader('http://www.google.com', tmpdir);
    const expectedContent = await fs.readFile(path.join(tmpdir, filename), 'utf8');

    expect(expectedContent).toBe(content);
    expect(result).toBe('Page uploaded successfully');
  });

  test('404 Not Found', async () => {
    const tmpdir = await getTmpDir();

    const result = await pageLoader('http://www.google.com/wrong', tmpdir);
    const files = await fs.readdir(tmpdir);

    expect(result).toBe('Request failed with status code 404');
    expect(files.length).toBe(0);
  });

  test('output directory does not exist', async () => {
    const nonExistentDir = path.join(os.tmpdir(), uuidV1());
    const result = await pageLoader('http://www.google.com', nonExistentDir);
    expect(result).toBe(`No such directory '${nonExistentDir}'`);
  });
});
