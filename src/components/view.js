// import CircularJSON from '../utils/circular-json';

export default Regular => {
	const RouterView = Regular.extend( {
		name: 'router-view',
		template: `
			<i ref="v"></i>
		`,
		config() {
			this._commentInserted = false;

			const $router = this.$router;
			const name = this.data.name || 'default';

			$router.emit( 'add-router-view', {
				phase: this.$root.__phase__,
				key: name,
				value: this
			} );

			// console.log( '>', name, CircularJSON.parse( CircularJSON.stringify( $router.current ) ) );

			this.$mute();
		},
		init() {
			if( !this._comment ) {
				this._comment = document.createComment( 'router-view' );
			}
		},
		clear() {
			if( this._prevcomponent ) {
				this._prevcomponent.$inject( false );
				this._prevcomponent.destroy();
			}
		},
		render( component ) {
			const comment = this._comment;
			if ( !this._commentInserted ) {
				Regular.dom.inject( comment, this.$refs.v, 'after' );
				this._commentInserted = true;
			}

			if ( this.$refs.v && this.$refs.v.parentNode ) {
				this.$refs.v.parentNode.removeChild( this.$refs.v );
				delete this.$refs.v;
			}

			if ( !component ) {
				// this.clear();
				return;
			}
			if ( comment.parentNode ) {
				component.$inject( comment, 'after' );
			}

			this._prevcomponent = component;
		}
	} );
}
