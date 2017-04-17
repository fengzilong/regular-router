function each(obj, fn) {
  const keys = Object.keys(obj);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    fn(obj[key], key, obj);
  }
}

export default each;
