define(
    'amd/deepDependency/level3',
    [
        'amd/deepDependency/level4'
    ],
    function ( level4 ) {
        return {
            name: 'amd/deepDependency/level3',
            check: function () {
                var valid = level4.name == 'amd/deepDependency/level4';

                return valid;
            }
        };
    }
);