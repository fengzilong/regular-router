import walk from './walk';
import { getCtor } from './ctor';

export default install;

function install( routes ) {
	walk( routes, function( route ) {
		const components = route.components || {};
		// combine
		if ( route.component ) {
			components[ 'default' ] = route.component;
		}
		for ( const slotName in components ) {
			walkComponents( components[ slotName ] );
		}
	} );
}

function walkComponents( definition ) {
	const Ctor = register( definition );
	const components = definition.components;

	// no dependencies
	if ( !components ) {
		return;
	}

	// avoid duplicate register
	delete definition.components;

	// register components
	for ( const name in components ) {
		Ctor.component( name, register( components[ name ] ) );
		walkComponents( components[ name ] );
	}
}

function register( definition ) {
	if ( definition._Ctor ) {
		return definition._Ctor;
	}

	const Component = getCtor();
	const Ctor = Component.extend( definition );
	definition._Ctor = Ctor;
	return Ctor;
}
