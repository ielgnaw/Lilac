define(
    'modules/cjs/simpleDependency/index',
    function ( require ) {
        var foo = require('modules/cjs/simpleDependency/foo');
        return {
            name: 'modules/cjs/simpleDependency/index',
            check: function () {
                return foo.name === 'modules/cjs/simpleDependency/foo'
            }
        };
    }
);