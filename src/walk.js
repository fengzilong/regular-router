import each from './utils/each';

let id = 0;
function walk(obj, fn, name) {
  each(obj, v => {
    const currentName = v.name || `annoymous_${id++}`;
    const path = name ? `${name}.${currentName}` : currentName;
    fn(v, path);
    if (v.children) {
      walk(v.children, fn, path);
    }
  });
}

export default walk;
