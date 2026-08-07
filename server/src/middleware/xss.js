const xss = require('xss');

const clean = (data) => {
  if (typeof data === 'string') return xss(data);
  if (typeof data === 'object' && data !== null) {
    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        data[key] = clean(data[key]);
      }
    }
  }
  return data;
};

const xssClean = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = xssClean;
