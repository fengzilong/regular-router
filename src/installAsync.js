import install from './install';

export default function(definition, Component) {
  if (typeof definition === 'function') {
    return definition().then(def => {
      install(def, Component);
      return def._Ctor;
    });
  } else {
    install(definition, Component);
    return Promise.resolve(definition._Ctor);
  }
}
