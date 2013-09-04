define(
    'circleDependency/index',
    [
        'circleDependency/cat',
        'circleDependency/dog'
    ],
    function ( require, cat ) {
        return {
            name: 'circleDependency/index',
            check: function () {
                var valid =
                    cat.name == 'circleDependency/cat'
                    && require( 'circleDependency/dog' ).name == 'circleDependency/dog'
                    && cat.check();
                return valid;
            }
        };
    }
);