define(
    'modules/dependency/deepDependency/level1',
    [
        'modules/dependency/deepDependency/level2',
        'modules/dependency/deepDependency/level21'
    ],
    function ( level2, level21 ) {
        return {
            name: 'modules/dependency/deepDependency/level1',
            check: function () {
                var valid =
                    level2.name == 'modules/dependency/deepDependency/level2'
                    && level21.name == 'modules/dependency/deepDependency/level21';

                return valid;
            }
        };
    }
);