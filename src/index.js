import Router from './router';

export default function createRouter(options) {
  // workaround for _classCallCheck with babel
  // move `instanceof` judgment from Router to createRouter
  if (this instanceof createRouter) {
    return new Router(options);
  } else {
    Router._Base = options;
  }
}
