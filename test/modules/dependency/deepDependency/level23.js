define(
    'modules/dependency/deepDependency/level23',
    [
        'modules/dependency/deepDependency/level31'
    ],
    function ( level31 ) {
        return {
            name: 'modules/dependency/deepDependency/level23',
            check: function () {
                var valid =
                    level31.name == 'modules/dependency/deepDependency/level31';

                return valid;
            }
        };
    }
);