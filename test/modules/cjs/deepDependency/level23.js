define(
    'modules/cjs/deepDependency/level23',
    function ( require ) {
        var level31 = require('modules/cjs/deepDependency/level31');
        return {
            name: 'modules/cjs/deepDependency/level23',
            check: function () {
                var valid =
                    level31.name == 'modules/cjs/deepDependency/level31';

                return valid;
            }
        };
    }
);