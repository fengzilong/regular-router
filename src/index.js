import Stateman from 'stateman';
import view from './components/view';
import link from './components/link';
import {setCtor, getCtor} from './ctor';
import each from './utils/each';
import walk from './walk';
import install from './install';
import checkPurview from './purview';

class Router {
  constructor(options, Regular) {
    // invoked as plugin
    if (!(this instanceof Router)) {
      setCtor(Regular);
      return;
    }

    // new
    this._options = options;
  }
  notfound(fn) {
    const router = this._instance();
    router.on('notfound', fn);
  }
  beforeEach(fn) {
    const router = this._instance();
    router.on('begin', fn);
  }
  afterEach(fn) {
    const router = this._instance();
    router.on('end', fn);
  }
  _instance() {
    if (!this.router) {
      this.router = new Stateman();
    }
    return this.router;
  }
  start(selector) {
    const Component = getCtor();
    if (!Component) {
      throw new Error('regular-router not initialized yet');
    }

    const rootNode = document.querySelector(selector || 'body');

    // make stateman avaiable for all Regular instances
    const stateman = this._instance();
    Component.implement({
      $router: stateman,
    });

    // register helper components
    Component.use(view);
    Component.use(link);

    // get routes from options.routes
    const {routes} = this._options;

    // flat
    const routeMap = {};
    walk(routes, function(route, name) {
      if (!~name.indexOf('.')) {
        route.isRootRoute = true;
      }
      routeMap[name] = route;
    });

    install(routes);

    const routerViewStack = {};
    stateman.on({
      'add-router-view': function({phase, key, value}) {
        routerViewStack[phase] = routerViewStack[phase] || {};
        routerViewStack[phase][key] = value;
      },
    });

    const transformed = {};
    for (const name in routeMap) {
      const route = routeMap[name];
      const parentName = name.split('.').slice(0, -1).join('.');
      const component = route.component;
      const components = route.components || {};
      const CtorMap = {};

      // combine
      if (!components['default'] && component) {
        components['default'] = component;
      }

      transformed[name] = {
        url: route.path,
        update() {
          const routerViews = routerViewStack[parentName] || {};
          each(routerViews, v => v.update());
        },
        enter(e) {
          // check routerViews when route enters
          const instanceMap = {};

          CtorMap[name] = {};
          for (let i in components) {
            const cp = components[i];
            CtorMap[name][i] = cp._Ctor;
          }

          // get instances, and routerViews will be mounted
          for (let i in CtorMap[name]) {
            instanceMap[i] = new CtorMap[name][i]({
              __phase__: name,
              __view__: i,
            });
          }

          const routerViews = routerViewStack[parentName];

          // render
          if (routerViews) {
            for (let i in routerViews) {
              const routerView = routerViews[i];
              routerView.render(instanceMap[i]);
            }
          }

          if (route.isRootRoute && instanceMap.default) {
            routeMap[name].rootInstance = instanceMap.default;
            instanceMap.default.$inject(rootNode);
          }
        },
        canEnter(e) {
          checkPurview(e, 'canEnter', components);
        },
        canLeave(e) {
          checkPurview(e, 'canLeave', components);
        },
        leave(e) {
          // clean
          const routerViews = routerViewStack[parentName];
          if (routerViews) {
            for (let i in routerViews) {
              const routerView = routerViews[i];
              routerView.clear();
            }
          }

          // if root route changes, destroy related root component
          if (routeMap[name].isRootRoute && routeMap[name].rootInstance) {
            routeMap[name].rootInstance.$inject(false);
            routeMap[name].rootInstance = null;
          }
        },
      };
    }

    stateman.state(transformed);

    stateman.start({
      prefix: '!',
    });
  }
}

export default Router;
