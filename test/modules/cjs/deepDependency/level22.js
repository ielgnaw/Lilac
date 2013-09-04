define(
    'modules/cjs/deepDependency/level22',
    function ( require ) {
        var level3 = require('modules/cjs/deepDependency/level3');
        return {
            name: 'modules/cjs/deepDependency/level22',
            check: function () {
                var valid =
                    level3.name == 'modules/cjs/deepDependency/level3'
                    && level3.check();

                return valid;
            }
        };
    }
);