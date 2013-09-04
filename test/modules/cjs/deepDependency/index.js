define(
    'modules/cjs/deepDependency/index',
    function ( require ) {
        var level1 = require('modules/cjs/deepDependency/level1');
        var level11 = require('modules/cjs/deepDependency/level11');
        return {
            name: 'modules/cjs/deepDependency/index',
            check: function () {
                var valid =
                    level1.name == 'modules/cjs/deepDependency/level1'
                    && level11.name == 'modules/cjs/deepDependency/level11'
                    && level1.check()
                    && level11.check();
                return valid;
            }
        };
    }
);