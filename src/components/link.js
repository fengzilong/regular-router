export default Regular => {
  Regular.extend({
    name: 'router-link',
    template: `
      <a href="{ to }">{#inc this.$body}</a>
    `,
  });
};
