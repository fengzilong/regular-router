import isCtor from './isCtor';

export default function promisify(target) {
  if (typeof target === 'function' && !isCtor(target)) {
    return target().then(v => handleEsModule(v));
  }

  return Promise.resolve(target);
}

function handleEsModule(definition) {
  if (definition.__esModule) {
    return definition.default;
  }

  return definition;
}
