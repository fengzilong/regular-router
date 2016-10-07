import walk from './walk';
import { getCtor } from './ctor';

export default function digestComponentDeps( routes ) {
	const Component = getCtor();
	let dirty = false;
	let ttl = 20;

	// handle components deps
	function walkComponents( extendOptions ) {
		// first and no deps
		if ( !extendOptions.components && !extendOptions._Ctor ) {
			extendOptions._Ctor = Component.extend( extendOptions );
			return;
		}

		const cps = extendOptions.components;

		// deps are ready
		let isReady = true;
		for ( let i in cps ) {
			if ( !cps[ i ]._Ctor ) {
				isReady = false;
				break;
			}
		}

		if ( isReady ) {
			const Ctor = Component.extend( extendOptions );
			// register component on Ctor
			for ( let i in cps ) {
				Ctor.component( i, cps[ i ]._Ctor )
			}
			extendOptions._Ctor = Ctor;
			return;
		}

		// if exists deps, and deps are not ready, mark as dirty, wait for next digest
		dirty = true;

		for ( let i in cps ) {
			walkComponents( cps[ i ] );
		}
	}

	function digestOne() {
		// reset
		dirty = false;

		walk( routes, function( route ) {
			const components = route.components || {};
			// combine
			if ( route.component ) {
				components[ 'default' ] = route.component;
			}
			for ( let i in components ) {
				walkComponents( components[ i ] );
			}
		} );

		ttl--;

		if ( !ttl ) {
			// error
			throw new Error( `components dependencies parse failed` );
		}

		if ( dirty && ttl ) {
			// next digest
			digestOne();
		}
	}

	digestOne();
}
