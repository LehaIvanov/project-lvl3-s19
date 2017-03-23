import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import os from 'os';
import Multispinner from 'multispinner';
import axios from './lib/axios';
import genErrorDescription from './gen-error-description';

const successMsg = 'Page uploaded successfully';
const tmpdirPrefix = 'page-loader-';
const spinnerInterval = 80;

const getNameByAddress = (address) => {
  const escape = str => str.replace(/\W+/g, '-');
  const urlObj = url.parse(address, true);

  if (urlObj.host === null) {
    if (urlObj.path.charAt(0) === '/') {
      return escape(urlObj.path.slice(1));
    }
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

const getResourceUrl = (src, pageUrl) => {
  const urlObj = url.parse(src, true);
  const urlForResource = urlObj.host === null ? url.resolve(pageUrl, src) : url.format(urlObj);
  return urlForResource;
};

const loadResource = async (resourceSrc, resourceUrl, pageUrl, downloadLocation) => {
  const fileName = getResourceFileName(resourceSrc);
  const filePath = path.resolve(downloadLocation, fileName);
  const res = await axios.get(resourceUrl);
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

const getResourceMapFromPage = (html, pageUrl) => {
  const $ = cheerio.load(html);
  let resourceArray = [];
  $('link[href], script[src]').each(function getSrc() {
    const attr = getLocationAttrbute($(this));
    const src = $(this).attr(attr);
    resourceArray = [...resourceArray, [src, getResourceUrl(src, pageUrl)]];
  });
  const resourceMap = new Map(resourceArray);
  return resourceMap;
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

const waitSpinnersAnimation = () =>
  new Promise(resolve => setTimeout(() => resolve(), spinnerInterval));

const loadPageToTmpDir = async (address, tmpPagePath, tmpResourcesPath, dirNameForResources) => {
  const res = await axios.get(address);
  const html = res.data;
  const resourceMap = getResourceMapFromPage(html, address);
  await fs.mkdir(tmpResourcesPath);
  const resourceUrlList = Array.from(resourceMap.values());
  const spinners = new Multispinner(resourceUrlList, {
    interval: spinnerInterval,
  });

  try {
    await Promise.all(Array.from(resourceMap.entries()).map(([resourceSrc, resourceUrl]) =>
      loadResource(resourceSrc, resourceUrl, address, tmpResourcesPath)
        .then(() => spinners.success(resourceUrl))));
  } catch (err) {
    Object.keys(spinners.spinners).forEach((key) => {
      const spin = spinners.spinners[key];
      if (spin.state === 'incomplete') {
        spinners.error(key);
      }
    });
    throw err;
  } finally {
    await waitSpinnersAnimation();
  }

  const $ = cheerio.load(html);
  $('link[href], script[src]').each(function replaceSrc() {
    const attr = getLocationAttrbute($(this));
    const src = $(this).attr(attr);
    $(this).attr(attr, path.join(dirNameForResources, getResourceFileName(src)));
  });
  await fs.writeFile(tmpPagePath, $.html(), 'utf8');
};

const checkDirectoryPathValid = async (inspectedDirectoryPath) => {
  await fs.readdir(inspectedDirectoryPath);
};

const pageLoader = async (address, downloadLocation) => {
  await checkDirectoryPathValid(downloadLocation);

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
    const desciption = genErrorDescription(err);
    err.message = desciption;
    return Promise.reject(err);
  }
};
