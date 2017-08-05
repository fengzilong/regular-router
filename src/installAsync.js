import isCtor from './utils/isCtor';
import install from './install';

export default function(definition, Component) {
  if (typeof definition === 'function' && !isCtor(definition)) {
    return definition().then(def => {
      return install(def, Component);
    });
  } else {
    return Promise.resolve(install(definition, Component));
  }
}
