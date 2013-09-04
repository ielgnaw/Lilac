define(
    'modules/cjs/deepDependency/level1',
    function ( require ) {
        var level2 = require('modules/cjs/deepDependency/level2');
        var level21 = require('modules/cjs/deepDependency/level21');
        return {
            name: 'modules/cjs/deepDependency/level1',
            check: function () {
                var valid =
                    level2.name == 'modules/cjs/deepDependency/level2'
                    && level21.name == 'modules/cjs/deepDependency/level21';

                return valid;
            }
        };
    }
);