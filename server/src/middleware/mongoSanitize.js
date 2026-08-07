const sanitize = (data) => {
  if (data instanceof Object) {
    for (const key in data) {
      if (key.startsWith('$') || key.includes('.')) {
        delete data[key];
      } else {
        sanitize(data[key]);
      }
    }
  }
  return data;
};

const mongoSanitizeMiddleware = () => (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  
  if (req.query) {
    try {
      for (const key in req.query) {
        if (key.startsWith('$') || key.includes('.')) {
          delete req.query[key];
        } else if (req.query[key] instanceof Object) {
          sanitize(req.query[key]);
        }
      }
    } catch (e) {
      // Fail-safe wrapper
    }
  }
  next();
};

module.exports = mongoSanitizeMiddleware;
