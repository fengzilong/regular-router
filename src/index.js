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

		// TODO: event emitter will be more easy
		let routerViewStack = {};
		stateman.on( {
			'add-router-view': function( { key, value } ) {
				const name = stateman.current.parent.name;
				routerViewStack[ name ] = routerViewStack[ name ] || {};
				routerViewStack[ name ][ key ] = value;
			},
			'purge-router-view': function() {
				const name = stateman.current.parent.name;
				routerViewStack[ name ] = {};
			}
		} );

		// transform routes
		const statemanRoutes = {};
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

			statemanRoutes[ name ] = {
				url: route.url,
				update( e ) {
					// reuse them, do nothing
				},
				enter( e ) {
					console.log( '@@route', e.current.name, 'enter' );
					const current = e.current;

					const instanceMap = {};
					// initialize component ctors
					if( !CtorMap[ name ] ) {
						CtorMap[ name ] = {};
						for ( let i in components ) {
							const cp = components[ i ];
							CtorMap[ name ][ i ] = Regular.extend( cp );
						}
					}

					// get instances, and routerViews will automatically mount to current after this
					for ( let i in CtorMap[ name ] ) {
						instanceMap[ i ] = new CtorMap[ name ][ i ]({
							data: {
								__view_name__: i
							}
						});
					}

					const routerViews = routerViewStack[ parentName ];

					// render router-view
					if ( routerViews ) {
						for ( let i in routerViews ) {
							const routerView = routerViews[ i ];
							// 当前的router-view可能找不到匹配的对象
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
					console.log( '@@route', e.path, 'leave' );

					// destroy them
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

		stateman.state( statemanRoutes );

		stateman.start( {
			root: '/example',
			prefix: '!'
		} );
	}
}

export default Router;
