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
				key: name,
				value: this
			} );

			// console.log( '>', CircularJSON.parse( CircularJSON.stringify( $router.current ) ) );

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
			if( !this.$root ) {
				return;
			}
			if ( this.$root.data.__view_name__ !== 'default' ) {
				this.$refs.v.parentNode && this.$refs.v.parentNode.removeChild( this.$refs.v );
				delete this.$refs.v;
				return;
			}
			const comment = this._comment;
			if ( !this._commentInserted && this.$refs.v.parentNode ) {
				Regular.dom.inject( comment, this.$refs.v, 'after' );
				this.$refs.v.parentNode.removeChild( this.$refs.v );
				delete this.$refs.v;
				this._commentInserted = true;
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
