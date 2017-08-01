export default install;

// install single component
function install(definition, Component) {
  const Ctor = register(definition, Component);
  const components = definition.components || {};
  const filters = definition.filters || {};

  // no dependencies
  if (!components) {
    return;
  }

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
}

function register(definition, Component) {
  if (definition._Ctor) {
    return definition._Ctor;
  }

  const Ctor = Component.extend(definition);
  definition._Ctor = Ctor;
  return Ctor;
}
