import Stateman from 'stateman';
import view from './components/view';
import link from './components/link';
import each from './utils/each';
import walk from './walk';
import checkPurview from './purview';

let Regular;

class Router {
	constructor( options ) {
		// directly call
		if ( !( this instanceof Router ) ) {
			Regular = options;
			return;
		}

		// new
		this._options = options;
	}
	start( selector ) {
		const rootNode =
			( selector && document.querySelector( selector ) ) ||
			document.body;

		// make stateman avaiable for all Regular instances
		const stateman = new Stateman();
		Regular.implement({
			$router: stateman
		});

		// register helper components
		Regular.use( view );
		Regular.use( link );

		// get routes from options.routes
		const { routes } = this._options;

		// flat
		const routeMap = {};
		walk( routes, function( v, name ) {
			if ( !~name.indexOf( '.' ) ) {
				v.isRootRoute = true;
			}
			routeMap[ name ] = v;
		} );

		let routerViewStack = {};
		stateman.on( {
			'add-router-view': function( { phase, key, value } ) {
				routerViewStack[ phase ] = routerViewStack[ phase ] || {};
				routerViewStack[ phase ][ key ] = value;
			},
			// 'purge-router-view': function( { phase } ) {
			// 	routerViewStack[ phase ] = {};
			// }
		} );

		// transform routes
		const transformedRoutes = {};
		for ( let name in routeMap ) {
			const route = routeMap[ name ];
			const parentName = name.split( '.' ).slice( 0, -1 ).join( '.' );
			const component = route.component;
			const components = route.components || {};
			const CtorMap = {};

			// combine
			if ( !components[ 'default' ] && component ) {
				components[ 'default' ] = component;
			}

			transformedRoutes[ name ] = {
				url: route.url,
				update( e ) {
					// reuse them, do nothing
				},
				enter( e ) {
					console.log( '@@route', name, 'enter' );
					const current = e.current;

					const instanceMap = {};

					// initialize component ctors
					CtorMap[ name ] = {};

					for ( let i in components ) {
						const cp = components[ i ];
						CtorMap[ name ][ i ] = Regular.extend( cp );
					}

					// get instances, and routerViews will be mounted
					for ( let i in CtorMap[ name ] ) {
						instanceMap[ i ] = new CtorMap[ name ][ i ]({
							__phase__: name,
							__view__: i
						});
					}

					const routerViews = routerViewStack[ parentName ];

					// render router-view
					if ( routerViews ) {
						for ( let i in routerViews ) {
							const routerView = routerViews[ i ];
							routerView.render( instanceMap[ i ] );
						}
					}

					if ( route.isRootRoute ) {
						instanceMap[ 'default' ] && instanceMap[ 'default' ].$inject( rootNode );
					}
				},
				canEnter( e ) {
					checkPurview( e, 'canEnter', components );
				},
				canLeave( e ) {
					checkPurview( e, 'canLeave', components );
				},
				leave( e ) {
					console.log( '@@route', name, 'leave' );

					const current = e.current;
					const routerViews = routerViewStack[ parentName ];

					// clean router-view
					if ( routerViews ) {
						for ( let i in routerViews ) {
							const routerView = routerViews[ i ];
							routerView.clear();
						}
					}
				}
			};
		}

		stateman.state( transformedRoutes );

		stateman.start( {
			root: '/example',
			prefix: '!'
		} );
	}
}

export default Router;
