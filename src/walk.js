import each from './utils/each';

let walkId = 0;
function walk( obj, fn, name = 'annoymous' ) {
	each( obj, v => {
		const wi = v.name || `${name}_${walkId++}`;
		fn( v, wi );
		if ( v.children ) {
			walk( v.children, fn, `${wi}.annoymous` );
		}
	} );
}

export default walk;
