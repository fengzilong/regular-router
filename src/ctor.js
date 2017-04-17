// maybe Regular or extended from Regular, both are ok
let _Component;

export const setCtor = Component => {
  _Component = Component;
};

export const getCtor = () => {
  return _Component;
};
