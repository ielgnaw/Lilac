define(
    'modules/dependency/deepDependency/level4',
    [
        'modules/dependency/deepDependency/level5'
    ],
    function ( level5 ) {
        return {
            name: 'modules/dependency/deepDependency/level4',
            check: function () {
                var valid = level5.name == 'modules/dependency/deepDependency/level5';

                return valid;
            }
        };
    }
);