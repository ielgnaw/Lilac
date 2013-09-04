define(
    'modules/dependency/simpleDependency/index',
    [ 'modules/dependency/simpleDependency/foo' ],
    function ( foo ) {
        return {
            name: 'modules/dependency/simpleDependency/index',
            check: function () {
                return foo.name === 'modules/dependency/simpleDependency/foo'
            }
        };
    }
);