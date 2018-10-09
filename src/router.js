import Stateman from 'stateman';
import View from './components/view';
import Link from './components/link';
import each from './utils/each';
import promisify from './utils/promisify';
import walk from './walk';
import install from './install';
import checkPurview from './purview';

class Router {
  constructor(options = {}) {
    this._options = options;
    this._hooks = {
      beforeEach: [],
      afterEach: []
    };
  }

  notfound(fn) {
    const router = this._getInstance();
    router.on('notfound', fn);
  }

  onBegin(fn) {
    const router = this._getInstance();
    router.on('begin', fn);
  }

  onEnd(fn) {
    const router = this._getInstance();
    router.on('end', fn);
  }

  beforeEach(fn) {
    this._hooks.beforeEach.push(fn);
  }

  afterEach(fn) {
    this._hooks.afterEach.push(fn);
  }

  configure(options = {}) {
    Object.assign(this._options, options);
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
    return install(definition, Component);
  }

  _resolveDefinitions(components) {
    return Promise.all(
      Object.keys(components).map(key => {
        return promisify(components[key]).then(component => ({
          key: key,
          component: component
        }));
      })
    ).then(results => {
      return results.reduce((prev, current) => {
        prev[current.key] = current.component;
        return prev;
      }, {});
    });
  }

  _resolveCtors(components) {
    const installations = Object.keys(components).map(key => {
      return this._install(components[key]).then(Ctor => ({
        key: key,
        ctor: Ctor
      }));
    });

    return Promise.all(installations).then(results => {
      return results.reduce((prev, current) => {
        prev[current.key] = current.ctor;
        return prev;
      }, {});
    });
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
      const parentName = name
        .split('.')
        .slice(0, -1)
        .join('.');
      const component = route.component;
      const components = route.components || {};

      // normalize
      if (!components['default'] && component) {
        components['default'] = component;
      }

      const instanceMap = {};

      transformed[name] = {
        url: route.path,
        meta: route.meta || {},
        update() {
          const routerViews = routerViewStack[parentName] || {};
          each(routerViews, v => v.update());

          // call hook
          self._resolveDefinitions(components).then(components => {
            for (const i in components) {
              const definition = components[i];
              const hook = definition.route && definition.route.update;
              if (typeof hook === 'function') {
                hook.call(instanceMap[i]);
              }
            }
          });
        },
        enter(e) {
          // check routerViews when route enters
          return self._resolveCtors(components).then(CtorMap => {
            // get instances, and routerViews will be mounted
            for (const i in CtorMap) {
              // use cached instance if possible
              if (!instanceMap[i]) {
                instanceMap[i] = new CtorMap[i]({
                  __phase__: name,
                  __view__: i
                }).$on('$destroy', () => {
                  instanceMap[i] = null;
                });
              }

              // call enter hook
              const enterHook =
                components[i].route && components[i].route.enter;
              if (typeof enterHook === 'function') {
                enterHook.call(instanceMap[i]);
                instanceMap[i].$update();
              }
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

            // call global hook
            self._hooks.afterEach.forEach(fn =>
              fn({
                from: e.previous,
                to: e.current,
                redirect: e.go
              })
            );
          });
        },
        canEnter(e) {
          const resolve = e.async();
          self._resolveDefinitions(components).then(components => {
            checkPurview(
              e,
              resolve,
              'canEnter',
              components,
              self._hooks.beforeEach
            );
          });
        },
        canLeave(e) {
          const resolve = e.async();
          self._resolveDefinitions(components).then(components => {
            checkPurview(e, resolve, 'canLeave', components, []);
          });
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

          // call hook
          self._resolveDefinitions(components).then(components => {
            for (const i in components) {
              const definition = components[i];
              const hook = definition.route && definition.route.leave;
              if (typeof hook === 'function') {
                hook.call(instanceMap[i]);
              }
            }
          });
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

    // should dynamic register instead of installing here
    // this._install(routes);

    stateman.state(this._transform(routes, selector));

    stateman.start({ prefix: '!' });
  }
}

export default Router;
