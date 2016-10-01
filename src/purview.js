const checkPurview = ( e, cmd, components, cb ) => {
	const done = e.async();
	const current = e.current;
	const go = e.go;

	let len = Object.keys( components ).length;

	function next() {
		len--;

		if( len === 0 ) {
			done();
			cb && cb();
		}
	}

	for ( let i in components ) {
		const component = components[ i ];
		const canTransition = component.route && component.route[ cmd ];
		if ( !canTransition ) {
			next();
		} else {
			canTransition( {
				route: current,
				redirect: go,
				next
			} );
		}
	}
};

export default checkPurview;
