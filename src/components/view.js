import {insertAfter} from '../utils/dom';

export default Component => {
  const RouterView = Component.extend({
    name: 'router-view',
    template: `<i ref="v"></i>`,
    config() {
      this._commentInserted = false;

      const $router = this.$router;
      const name = this.data.name || 'default';

      $router.emit('add-router-view', {
        phase: this.$root.__phase__,
        key: name,
        value: this,
      });

      this.$mute(true);
    },
    init() {
      if (!this._comment) {
        this._comment = document.createComment('router-view');
      }
    },
    clear() {
      if (this._prevcomponent) {
        this._prevcomponent.$inject(false);
        this._prevcomponent.destroy();
      }
    },
    update() {
      const prevComponent = this._prevcomponent;
      if (prevComponent) {
        if (
          prevComponent.route &&
          typeof prevComponent.route.update === 'function'
        ) {
          prevComponent.route.update.call(prevComponent);
        }
        prevComponent.$update();
      }
    },
    render(component) {
      const comment = this._comment;
      if (!this._commentInserted) {
        insertAfter(comment, this.$refs.v);
        this._commentInserted = true;
      }

      if (this.$refs.v && this.$refs.v.parentNode) {
        this.$refs.v.parentNode.removeChild(this.$refs.v);
        delete this.$refs.v;
      }

      if (!component) {
        // this.clear();
        return;
      }
      if (comment.parentNode) {
        component.$inject(comment, 'after');
      }

      this._prevcomponent = component;
    },
  });
};
