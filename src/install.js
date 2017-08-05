import isCtor from './utils/isCtor';

export default install;

// install single component
function install(definition, Component) {
  const Ctor = register(definition, Component);

  // no dependencies
  if (!definition.components) {
    return Ctor;
  }

  const components = definition.components || {};
  const filters = definition.filters || {};

  // avoid duplicate register
  delete definition.components;

  // register components
  for (const name in components) {
    Ctor.component(name, register(components[name], Component));
    install(components[name], Component);
  }

  // register filters
  for (const name in filters) {
    Ctor.filter(name, filters[name]);
  }

  return Ctor;
}

function register(definition, Component) {
  if (isCtor(definition)) {
    return definition;
  }

  if (definition._Ctor) {
    return definition._Ctor;
  }

  const Ctor = Component.extend(definition);
  definition._Ctor = Ctor;
  return Ctor;
}
