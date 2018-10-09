const checkPurview = (
  e,
  resolve,
  hookName,
  components,
  globalHooks = [],
  cb
) => {
  const from = e.previous;
  const to = e.current;
  const go = e.go;

  let len = Object.keys(components).length + globalHooks.length;

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
        redirect: go,
        next
      });
    }
  }

  globalHooks.forEach(fn =>
    fn({
      from: from,
      to: to,
      redirect: go,
      next
    })
  );
};

export default checkPurview;
