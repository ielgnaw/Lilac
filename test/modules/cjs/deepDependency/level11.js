define(
    'modules/cjs/deepDependency/level11',
    function ( require) {
        var level22 = require('modules/cjs/deepDependency/level22');
        var level23 = require('modules/cjs/deepDependency/level23');
        return {
            name: 'modules/cjs/deepDependency/level11',
            check: function () {
                var valid =
                    level22.name == 'modules/cjs/deepDependency/level22'
                    && level23.name == 'modules/cjs/deepDependency/level23'
                    && level22.check()
                    && level23.check();

                return valid;
            }
        };
    }
);