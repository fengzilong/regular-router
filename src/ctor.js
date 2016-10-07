// maybe Regular or extended from Regular, either is ok
let _Component;

export const setCtor = Component => {
	_Component = Component;
};

export const getCtor = () => {
	return _Component;
};
