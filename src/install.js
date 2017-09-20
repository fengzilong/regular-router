import isCtor from './utils/isCtor';
import installSync from './installSync';

export default function(definition, Component) {
  if (typeof definition === 'function' && !isCtor(definition)) {
    return definition().then(def => {
      return installSync(def, Component);
    });
  } else {
    return Promise.resolve(installSync(definition, Component));
  }
}
