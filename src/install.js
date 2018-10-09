import promisify from './utils/promisify';
import installSync from './installSync';

export default function(definition, Component) {
  return promisify(definition).then(def => {
    return installSync(def, Component);
  });
}
