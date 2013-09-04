define(
    'modules/dependency/deepDependency/level11',
    [
        'modules/dependency/deepDependency/level22',
        'modules/dependency/deepDependency/level23'
    ],
    function ( level22, level23 ) {
        return {
            name: 'modules/dependency/deepDependency/level11',
            check: function () {
                var valid =
                    level22.name == 'modules/dependency/deepDependency/level22'
                    && level23.name == 'modules/dependency/deepDependency/level23'
                    && level22.check()
                    && level23.check();

                return valid;
            }
        };
    }
);