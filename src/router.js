import Stateman from 'stateman';
import View from './components/view';
import Link from './components/link';
import each from './utils/each';
import walk from './walk';
import installAsync from './installAsync';
import checkPurview from './purview';

class Router {
  constructor(options) {
    // new
    this._options = options || {};
  }

  notfound(fn) {
    const router = this._getInstance();
    router.on('notfound', fn);
  }

  beforeEach(fn) {
    const router = this._getInstance();
    router.on('begin', fn);
  }

  afterEach(fn) {
    const router = this._getInstance();
    router.on('end', fn);
  }

  _check() {
    const Component = Router._Base;

    if (!Component) {
      throw new Error('regular-router is not initialized yet');
    }
  }

  _getInstance() {
    if (!this.router) {
      this.router = new Stateman();
    }
    return this.router;
  }

  // mount stateman instance as $router
  _inject(stateman) {
    const Component = Router._Base;

    Component.implement({
      $router: stateman
    });
  }

  // register router-related components
  _register() {
    const Component = Router._Base;
    Component.use(View);
    Component.use(Link);
  }

  _install(definition) {
    const Component = Router._Base;
    return installAsync(definition, Component);
  }

  _transform(routes, selector) {
    const stateman = this._getInstance();
    const self = this;

    const routeMap = {};
    walk(routes, function(route, name) {
      if (!~name.indexOf('.')) {
        route.isRootRoute = true;
      }
      routeMap[name] = route;
    });

    const routerViewStack = {};
    stateman.on({
      'add-router-view': function({ phase, key, value }) {
        routerViewStack[phase] = routerViewStack[phase] || {};
        routerViewStack[phase][key] = value;
      }
    });

    const transformed = {};
    for (const name in routeMap) {
      const route = routeMap[name];
      const parentName = name.split('.').slice(0, -1).join('.');
      const component = route.component;
      const components = route.components || {};
      const CtorMap = {};

      // merge
      if (!components['default'] && component) {
        components['default'] = component;
      }

      transformed[name] = {
        url: route.path,
        update() {
          const routerViews = routerViewStack[parentName] || {};
          each(routerViews, v => v.update());
        },
        // 每次路由匹配都重新构造实例
        enter(e) {
          // check routerViews when route enters
          const instanceMap = {};

          const promises = [];
          CtorMap[name] = {};
          for (const i in components) {
            let definition = components[i];
            promises.push(
              self._install(definition).then(Ctor => {
                CtorMap[name][i] = Ctor;
              })
            );
          }

          return Promise.all(promises).then(() => {
            // get instances, and routerViews will be mounted
            for (const i in CtorMap[name]) {
              instanceMap[i] =
                instanceMap[i] ||
                new CtorMap[name][i]({
                  __phase__: name,
                  __view__: i
                }).$on('$destroy', () => {
                  instanceMap[i] = null;
                });
            }

            const routerViews = routerViewStack[parentName];

            // render
            if (routerViews) {
              for (const i in routerViews) {
                const routerView = routerViews[i];
                routerView.render(instanceMap[i]);
              }
            }

            if (route.isRootRoute && instanceMap.default) {
              const rootNode = document.querySelector(selector || 'body');
              routeMap[name].rootInstance = instanceMap.default;
              instanceMap.default.$inject(rootNode);
            }
          });
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
            for (const i in routerViews) {
              const routerView = routerViews[i];
              routerView.clear();
            }
          }

          // if root route changes, destroy related root component
          if (routeMap[name].isRootRoute && routeMap[name].rootInstance) {
            routeMap[name].rootInstance.$inject(false);
            routeMap[name].rootInstance = null;
          }
        }
      };
    }

    return transformed;
  }

  start(selector) {
    const { routes } = this._options;
    const stateman = this._getInstance();

    this._check();

    this._inject(stateman);

    this._register();

    // should dynamic register
    // this._install(routes);

    stateman.state(this._transform(routes, selector));

    stateman.start({ prefix: '!' });
  }
}

export default Router;
