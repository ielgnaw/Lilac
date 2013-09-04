define(
    'modules/dependency/simpleDependency/depNotDefineId',
    [ 'modules/dependency/simpleDependency/bar' ],
    function ( bar ) {
        return {
            name: 'modules/dependency/simpleDependency/depNotDefineId',
            check: function () {
                return bar.name === 'modules/dependency/simpleDependency/bar'
            }
        };
    }
);