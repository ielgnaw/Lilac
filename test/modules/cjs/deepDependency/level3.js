define(
    'modules/cjs/deepDependency/level3',
    [
        'modules/cjs/deepDependency/level4'
    ],
    {
        name: 'modules/cjs/deepDependency/level3',
        check: function () {
            var level4 = require( 'modules/cjs/deepDependency/level4' );
            console.error('level4', level4);
            var valid =
                level4.name == 'modules/cjs/deepDependency/level4'
                && level4.check();

            return valid;
        }
    }
);