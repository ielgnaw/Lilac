define(
    [ './inner/foo' ],
    function ( foo ) {
        return {
            name: 'modules/dependency/simpleDependency/relative',
            check: function () {
                return foo.name === 'modules/dependency/simapleDependency/inner/foo'
            }
        };
    }
);