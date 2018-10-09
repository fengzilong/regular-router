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

  // avoid unnecessary re-registering for next time
  delete definition.components;

  // register components
  for (const name in components) {
    Ctor.component(name, register(components[name], Component));
    install(components[name], Component);
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

  const filters = definition.filters || {};
  const Ctor = Component.extend(definition);

  // register filters
  for (const name in filters) {
    Ctor.filter(name, filters[name]);
  }

  definition._Ctor = Ctor;
  return Ctor;
}
