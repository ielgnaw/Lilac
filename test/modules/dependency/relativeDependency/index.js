define(
    [ './inner/foo', './bar' ],
    function ( foo, bar ) {
        return {
            name: 'modules/dependency/relativeDependency/index',
            check: function () {
                var valid =
                    foo.name == 'modules/dependency/relativeDependency/inner/foo'
                    && bar.name == 'modules/dependency/relativeDependency/bar'
                return valid;
            }
        };
    }
);