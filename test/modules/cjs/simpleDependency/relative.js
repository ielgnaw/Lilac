define(
    function ( require ) {
        var foo = require('./inner/foo');
        return {
            name: 'modules/cjs/simpleDependency/relative',
            check: function () {
                return foo.name === 'modules/cjs/simapleDependency/inner/foo'
            }
        };
    }
);