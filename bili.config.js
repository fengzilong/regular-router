const pkg = require( './package.json' )

module.exports = {
  format: 'all',
  compress: true,
  moduleName: 'RegularRouter',
  banner: {
    name: 'regular-router',
    version: pkg.version,
    author: 'fengzilong',
    year: 2016,
    license: 'MIT',
  }
};
