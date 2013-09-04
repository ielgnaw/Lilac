define(
    'modules/cjs/simpleDependency/depNotDefineId',
    function ( require ) {
        var bar = require('modules/cjs/simpleDependency/bar');
        return {
            name: 'modules/cjs/simpleDependency/depNotDefineId',
            check: function () {
                return bar.name === 'modules/cjs/simpleDependency/bar'
            }
        };
    }
);