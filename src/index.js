import Stateman from 'stateman';
import view from './components/view';
import link from './components/link';

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

		// setup routes from options.routes
		const { routes } = this._options;

		// transform routes
		const statemanRoutes = {};
		for ( let i in routes ) {
			const route = routes[ i ];
			const Component = route.component;
			const Components = route.components || {};

			statemanRoutes[ i ] = {
				url: route.url,
				canEnter( e ) {
					let components = this.components;

					// cache components by default, if you want to clean state, do it in component.route.enter hook on your own
					if ( !components ) {
						this.components = components = {};
						if ( !Components[ 'default' ] ) {
							Components[ 'default' ] = Component;
						}
						this.Components = Components;

						for ( let i in Components ) {
							const Comp = Components[ i ];
							// check Component
							if ( Comp && Comp.extend ) {
								components[ i ] = new Comp();
							}
						}
					}

					// TODO: pick all routerViews out into this.

					const done = e.async();

					let len = Object.keys( components ).length;
					function next() {
						len--;

						if( len === 0 ) {
							done();
						}
					}

					for ( let i in components ) {
						const component = components[ i ];
						const canEnter = component.route && component.route.canEnter.bind( component );
						if ( !canEnter ) {
							next();
						} else {
							canEnter( {
								route: this,
								redirect: e.go,
								next: next
							} );
						}
					}
				},
				enter( e ) {
					const parent = this.parent;
					const routerViews = parent.components && parent.components[ 'default' ] && parent.components[ 'default' ].__router_views__ && parent.components[ 'default' ].__router_views__;
					const components = this.components || {};
					const Components = this.Components || {};

					if ( !components ) {
						return;
					}

					if ( routerViews ) {
						// find component for all routerView, if not found, just clean prev component
						for ( let i in routerViews ) {
							const routerView = routerViews[ i ];
							const component = components[ i ];
							if ( component ) {
								routerView.render( components[ i ] );
							} else {
								routerView.clear();
							}
						}
					} else {
						for ( let i in components ) {
							const component = components[ i ];
							component.$inject( rootNode );
						}
					}
				},
				canLeave( e ) {

				},
				leave( e ) {

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
