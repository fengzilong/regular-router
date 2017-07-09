const checkPurview = (e, hookName, components, cb) => {
  const resolve = e.async();
  const from = e.previous;
  const to = e.current;
  const go = e.go;

  let len = Object.keys(components).length;

  function next(rst) {
    len--;

    if (rst === false) {
      resolve(false);
    } else if (len === 0) {
      resolve();
      cb && cb();
    }
  }

  for (const i in components) {
    const component = components[i];
    const canTransition = component.route && component.route[hookName];

    if (!canTransition) {
      next();
    } else {
      canTransition({
        from: from,
        to: to,
        route: to,
        redirect: go,
        next
      });
    }
  }
};

export default checkPurview;
