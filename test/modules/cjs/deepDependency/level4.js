define(
    'modules/cjs/deepDependency/level4',
    function ( require ) {
        var level5 = require('modules/cjs/deepDependency/level5');
        return {
            name: 'modules/cjs/deepDependency/level4',
            check: function () {
                var valid = level5.name == 'modules/cjs/deepDependency/level5';

                return valid;
            }
        };
    }
);