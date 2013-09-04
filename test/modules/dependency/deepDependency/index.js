define(
    'modules/dependency/deepDependency/index',
    [
        'modules/dependency/deepDependency/level1',
        'modules/dependency/deepDependency/level11'
    ],
    function ( level1, level11 ) {
        return {
            name: 'modules/dependency/deepDependency/index',
            check: function () {
                var valid =
                    level1.name == 'modules/dependency/deepDependency/level1'
                    && level11.name == 'modules/dependency/deepDependency/level11'
                    && level1.check()
                    && level11.check();
                return valid;
            }
        };
    }
);