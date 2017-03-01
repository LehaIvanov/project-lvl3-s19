import axios from 'axios';
import fs from 'mz/fs';
import url from 'url';
import path from 'path';

const successMsg = 'Page uploaded successfully';

const getPageUrlWithoutScheme = (pageUrl) => {
  const urlObj = url.parse(pageUrl, true);
  return urlObj.path === '/' ? urlObj.host : `${urlObj.host}${urlObj.path}`;
};

const getFullPathOutputFile = (pageUrl, output) => {
  const fileName = `${getPageUrlWithoutScheme(pageUrl).replace(/\W+/g, '-')}.html`;
  return path.resolve(output, fileName);
};

const pageLoader = async (pageUrl, output) => {
  const filePath = getFullPathOutputFile(pageUrl, output);
  const res = await axios.get(pageUrl);
  await fs.writeFile(filePath, res.data);

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
