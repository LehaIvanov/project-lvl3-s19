import fs from 'mz/fs';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import axios from './lib/axios';

const successMsg = 'Page uploaded successfully';

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

const loadResource = async (src, mainPageUrl, downloadLocation) => {
  const fileName = getResourceFileName(src);
  const urlObj = url.parse(src, true);
  const urlForResource = urlObj.host === null ? url.resolve(mainPageUrl, src) : url.format(urlObj);
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

const pageLoader = async (address, downloadLocation) => {
  const resMainPage = await axios.get(address);
  const resources = getResourcesFromPage(resMainPage.data);
  const dirNameForResources = `${getNameByAddress(address)}_files`;
  const pathForResources = path.resolve(downloadLocation, dirNameForResources);
  await fs.mkdir(pathForResources);
  await Promise.all(resources.map(src => loadResource(src, address, pathForResources)));

  const mainPagePath = path.resolve(downloadLocation, `${getNameByAddress(address)}.html`);
  const $ = cheerio.load(resMainPage.data);
  $('link[href], script[src]').each(function replaceSrc() {
    const attr = getLocationAttrbute($(this));
    const src = $(this).attr(attr);
    $(this).attr(attr, path.join(dirNameForResources, getResourceFileName(src)));
  });
  await fs.writeFile(mainPagePath, $.html(), 'utf8');

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
