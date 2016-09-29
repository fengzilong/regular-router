export default Regular => {
	const RouterView = Regular.extend( {
		name: 'router-view',
		template: `
			<i ref="v"></i>
		`,
		config() {
			this._commentInserted = false;

			if( !this.$parent.__router_views__ ) {
				this.$parent.__router_views__ = {};
			}

			// auto pass current router-view instance to parent
			const name = this.data.name;
			if ( !name ) {
				this.$parent.__router_views__[ 'default' ] = this;
			} else {
				this.$parent.__router_views__[ name ] = this;
			}

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
			}
		},
		render( component ) {
			const comment = this._comment;
			if ( !this._commentInserted ) {
				Regular.dom.inject( comment, this.$refs.v, 'after' );
				this.$refs.v.parentNode.removeChild( this.$refs.v );
				delete this.$refs.v;
				this._commentInserted = true;
			}

			if ( !component ) {
				return;
			}

			component.$inject( comment, 'after' );
			this._prevcomponent = component;
		}
	} );
}
