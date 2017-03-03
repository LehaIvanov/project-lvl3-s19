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

const loadAllResources = (resources, mainPageUrl, downloadLocation) =>
  new Promise((resolve) => {
    let completed = 0;
    const done = () => {
      completed += 1;
      if (completed === resources.length) {
        resolve();
      }
    };

    resources.forEach(s => loadResource(s, mainPageUrl, downloadLocation).then(done).catch(done));
  });

const getResourcesFromPage = (html) => {
  const $ = cheerio.load(html);

  return $('link[href], script[src]')
    .map(function getSrc() {
      if ($(this).is('link')) {
        return $(this).attr('href');
      }
      return $(this).attr('src');
    })
    .toArray();
};

const pageLoader = async (address, downloadLocation) => {
  const resMainPage = await axios.get(address);
  const resources = getResourcesFromPage(resMainPage.data);
  const dirNameForResources = `${getNameByAddress(address)}_files`;
  const pathForResources = path.resolve(downloadLocation, dirNameForResources);
  await fs.mkdir(pathForResources);
  await loadAllResources(resources, address, pathForResources);

  const mainPagePath = path.resolve(downloadLocation, `${getNameByAddress(address)}.html`);
  const $ = cheerio.load(resMainPage.data);
  $('link[href], script[src]').each(function replaceSrc() {
    if ($(this).is('link')) {
      const href = $(this).attr('href');
      $(this).attr('href', path.join(dirNameForResources, getResourceFileName(href)));
    } else {
      const src = $(this).attr('src');
      $(this).attr('src', path.join(dirNameForResources, getResourceFileName(src)));
    }
  });
  await fs.writeFile(mainPagePath, $.html(), 'utf8');

  return successMsg;
};

export default async (pageUrl, output = './') => {
  try {
    return await pageLoader(pageUrl, output);
  } catch (err) {
    if (err.message.startsWith('ENOENT')) {
      return `No such directory '${path.resolve(output)}'`;
    }
    return err.message;
  }
};
