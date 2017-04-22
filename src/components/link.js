export default Component => {
  Component.extend({
    name: 'router-link',
    template: `<a href="{ to }">{#inc this.$body}</a>`
  });
};
