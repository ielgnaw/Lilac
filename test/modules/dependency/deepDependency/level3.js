define(
    'modules/dependency/deepDependency/level3',
    [
        'modules/dependency/deepDependency/level4'
    ],
    {
        name: 'modules/dependency/deepDependency/level3',
        check: function () {
            var level4 = require( 'modules/dependency/deepDependency/level4' );
            var valid =
                level4.name == 'modules/dependency/deepDependency/level4'
                && level4.check();

            return valid;
        }
    }
);