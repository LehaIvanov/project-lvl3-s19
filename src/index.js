import axios from 'axios';

const pageLoader = async (link) => {
  const html = axios.get(link);
  return html;
};

export default pageLoader;
