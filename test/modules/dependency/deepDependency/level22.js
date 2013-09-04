define(
    'modules/dependency/deepDependency/level22',
    [
        'modules/dependency/deepDependency/level3'
    ],
    function ( level3 ) {
        return {
            name: 'modules/dependency/deepDependency/level22',
            check: function () {
                var valid =
                    level3.name == 'modules/dependency/deepDependency/level3'
                    && level3.check();

                return valid;
            }
        };
    }
);