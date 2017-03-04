import errno from 'errno';

const isRequestError = err => err.response && err.response.status !== 200;

const isFileSystemError = err => errno.errno[err.errno];

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

const genErrorDescription = (err) => {
  if (isRequestError(err)) {
    return `${err.message} [${err.response.config.url}]`;
  } else if (isFileSystemError(err)) {
    const description = capitalize(errno.errno[err.errno].description);
    return `${description} [${err.path}]`;
  }

  return err.message;
};

export default genErrorDescription;
