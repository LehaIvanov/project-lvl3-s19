import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import os from 'os';
import axios from './lib/axios';

const successMsg = 'Page uploaded successfully';
const tmpdirPrefix = 'page-loader-';

const getNameByAddress = (address) => {
  const escape = str => str.replace(/\W+/g, '-');
  const urlObj = url.parse(address, true);

  if (urlObj.host === null) {
    return escape(urlObj.path);
  }

  const addressWithoutScheme = urlObj.path === '/' ? urlObj.host : `${urlObj.host}${urlObj.path}`;
  return escape(addressWithoutScheme);
};

const getResourceFileName = (src) => {
  const ext = path.extname(src);
  const srcWithoutExt = ext ? src.substr(0, src.lastIndexOf(ext)) : src;
  const fileName = `${getNameByAddress(srcWithoutExt)}${ext}`;
  return fileName;
};

const loadResource = async (src, pageUrl, downloadLocation) => {
  const fileName = getResourceFileName(src);
  const urlObj = url.parse(src, true);
  const urlForResource = urlObj.host === null ? url.resolve(pageUrl, src) : url.format(urlObj);
  const filePath = path.resolve(downloadLocation, fileName);
  const res = await axios.get(urlForResource);
  await fs.writeFile(filePath, res.data, 'utf8');
};

const getLocationAttrbute = (elem) => {
  switch (elem.prop('tagName')) {
    case 'LINK': {
      return 'href';
    }
    default: {
      return 'src';
    }
  }
};

const getResourcesFromPage = (html) => {
  const $ = cheerio.load(html);

  return $('link[href], script[src]')
    .map(function getSrc() {
      const attr = getLocationAttrbute($(this));
      return $(this).attr(attr);
    })
    .toArray();
};

const copyFile = (source, target) => new Promise((resolve, reject) => {
  const rs = fs.createReadStream(source);
  rs.on('error', (err) => {
    reject(err);
  });

  const ws = fs.createWriteStream(target);
  ws.on('error', (err) => {
    reject(err);
  });

  rs.pipe(ws);

  rs.on('end', () => {
    resolve();
  });
});

const getCopyResourcesPromises = (resourceTmpFiles, tmpResourcesPath, resourcesPath) =>
  resourceTmpFiles.map(file =>
    copyFile(path.resolve(tmpResourcesPath, file), path.resolve(resourcesPath, file)));

const loadPageToTmpDir = async (address, tmpPagePath, tmpResourcesPath, dirNameForResources) => {
  const res = await axios.get(address);
  const html = res.data;
  const resources = getResourcesFromPage(html);
  await fs.mkdir(tmpResourcesPath);
  await Promise.all(resources.map(src => loadResource(src, address, tmpResourcesPath)));

  const $ = cheerio.load(html);
  $('link[href], script[src]').each(function replaceSrc() {
    const attr = getLocationAttrbute($(this));
    const src = $(this).attr(attr);
    $(this).attr(attr, path.join(dirNameForResources, getResourceFileName(src)));
  });
  await fs.writeFile(tmpPagePath, $.html(), 'utf8');
};

const checkPathValid = async (inspectedPath) => {
  await fs.stat(inspectedPath);
};

const pageLoader = async (address, downloadLocation) => {
  await checkPathValid(downloadLocation);

  const dirNameForResources = `${getNameByAddress(address)}_files`;
  const fileNameForPage = `${getNameByAddress(address)}.html`;
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), tmpdirPrefix));
  const tmpResourcesPath = path.resolve(tmpdir, dirNameForResources);
  const resourcesPath = path.resolve(downloadLocation, dirNameForResources);
  const tmpPagePath = path.resolve(tmpdir, fileNameForPage);
  const pagePath = path.resolve(downloadLocation, fileNameForPage);

  await loadPageToTmpDir(address, tmpPagePath, tmpResourcesPath, dirNameForResources);
  const resourceTmpFiles = await fs.readdir(tmpResourcesPath);
  await fs.mkdir(resourcesPath);
  await Promise.all([...getCopyResourcesPromises(resourceTmpFiles, tmpResourcesPath, resourcesPath),
    copyFile(tmpPagePath, pagePath)]);

  return successMsg;
};

export default async (pageUrl, output = './') => {
  try {
    return await pageLoader(pageUrl, output);
  } catch (err) {
    if (err.message.startsWith('ENOENT')) {
      return Promise.reject(new Error(`No such directory '${path.resolve(output)}'`));
    }
    return Promise.reject(err);
  }
};
