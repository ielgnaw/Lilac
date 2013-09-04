define(
    function ( require ) {
        var foo = require('./inner/foo');
        var bar = require('./bar');
        return {
            name: 'modules/cjs/relativeDependency/index',
            check: function () {
                var valid =
                    foo.name == 'modules/cjs/relativeDependency/inner/foo'
                    && bar.name == 'modules/cjs/relativeDependency/bar'
                return valid;
            }
        };
    }
);